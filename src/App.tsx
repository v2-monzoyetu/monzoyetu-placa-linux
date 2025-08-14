import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { Card } from "./components/ui/card";
import { ThemeProvider } from "./components/theme-provider";
import useSocket from "./hooks/use-socket";
import { Button } from "./components/ui/button";
import { AlertCircle, CheckCheck, ChevronRight, Cog, HelpingHand, Loader2Icon, LogOut, RefreshCcw } from "lucide-react";
import { Separator } from "./components/ui/separator";
import { isAuthenticated } from "./lib/utils";
import toast, { Toaster } from "react-hot-toast";
import { UserProvider } from "./provider/UserProvider";
import userModel from "./model/userModel";
const Login = lazy(() => import("./pages/Login"));
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import cookies from "./helper/cookies";
import { Http } from "./helper/Http";
import condominioModel from "./model/condominioModel";
import apiModel from "./model/apiModel";
import processModel from "./model/processModel";
import { ProcessStatus } from "./components/ProcessStatus";

function isValidBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
}

function App() {
    //Socket 
    const { socket, connected } = useSocket('https://socket.monzoyetu.com');
    const [loading, setIsLoading] = useState<boolean>(true);
    const [asLogin, setAsLogin]   = useState<boolean | undefined>(undefined);

    useEffect(() => {
        if (!socket) return;
            socket.on('message', (data) => {
                console.log(data);
            });
    }, [socket]);

  useEffect(() => {
    if(isAuthenticated()){
      setAsLogin(true)
    }else{
      setAsLogin(false)
    }
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);
  
  //Condominio Loading
  const [loadingCondominio, setIsLoadingCondominio] = useState<boolean>(false);
  const [condominios, setCondominios] = useState<Array<condominioModel>>([]);
  const [condominioId, setCondominioId] = useState<number | undefined>(0);

  const getCondominios = async () => {
    if (asLogin === undefined || asLogin == false) return;
    
    setIsLoadingCondominio(true)

    try {

    new Http().get('/v1/concierge/condominios', {
    headers: true,
    }).then(res =>{
      if(res.status == 200){
        const data = res.body as apiModel;
        setCondominios(data.results.data as Array<condominioModel>);
        const id = data.results.data[0].id;
        setCondominioId(id);
      }
      setIsLoadingCondominio(false)
    })
    
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(message)
      setIsLoadingCondominio(false)
    }
  }

  useEffect(() => {
    if (asLogin === undefined || asLogin == false) return;
    getCondominios();
  }, [asLogin]);

  const iniciarUARTs = async () => {
    // Receber dados
    await listen("uart-data", (event) => {
      const [porta, dados] = (event.payload as string).split("|");
      console.log(`📥 [${porta}] ${dados}`);
    });

    // Iniciar leitura de 4 portas
    await invoke("start_uart", {
      configs: [
        { port_name: "/dev/ttyS1", baud_rate: 115200 },
        { port_name: "/dev/ttyS2", baud_rate: 115200 },
        { port_name: "/dev/ttyS3", baud_rate: 115200 },
        { port_name: "/dev/ttyS4", baud_rate: 115200 },
      ]
    });
  }

  useEffect(() => {
    if (asLogin === undefined || asLogin == false) return;
    iniciarUARTs();
  }, [asLogin])
  

  useEffect(() => {
    let buffer = "";

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        scanResult(buffer);
        buffer = ""; // limpa para próxima leitura
      } else {
        // Acumula os caracteres
        buffer += e.key;
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
    };
  }, []);

  const scanResult = (result: string) => {
    const trimmed = result.trim();

    if (isValidBase64(trimmed)) {
      try {
        const decoded = atob(trimmed);
        const qrdata = JSON.parse(decoded);
        addItem(qrdata);
      } catch (err: unknown) {
        let errorMessage = "Something went wrong";
        if (err instanceof Error) {
            errorMessage = err.message;
        }
        toast.error(`Erro ao processar o QRCode: ${errorMessage}`);
      }
    } else if (trimmed.length === 20 || trimmed.length === 10) {
      check({ code: trimmed });
    } else {
      toast.error("QRCode inválido!");
    }
  }
  
  const [processList, setProcessList] = useState<processModel[]>([]);
  const [processArea, setProcessArea] = useState<React.ReactNode|undefined>(undefined);

  const addItem = async (qrdata: {id: string|number, type: string, code: string}) => {
    try {
      let message = "Processando...";
      if (qrdata.type === "employee") message = "Funcionário";
      else if (qrdata.type === "resident") message = "Morador";
      else if (qrdata.type === "vehicle") message = "Veículo";
      else if (qrdata.type === "visitor") message = "Visitante";

      // Item inicial
      const tile: processModel = {
        title: message,
        subtitle: "n/a",
        status: <Loader2Icon className="animate-spin" size={20} />,
      };

      if (processList.length >= 100) {
        setProcessList([]);
      }

      setProcessList((prev) => [...prev, tile]);

      // Verifica dados
      const result = await check(qrdata);

      if (result?.status === 200) {
        const item = result?.body.result.data[0] || {};
        let checkValidation = false;

        if (qrdata.type === "employee") {
          const checkValidation = await validateEmployee(item.id, item.situation);
          tile.subtitle = item.nome || "n/a";
          tile.status = checkValidation ? <CheckCheck color="green" size={20}/> : <AlertCircle color="yellow" size={20}/>;
          if (checkValidation) {
            await invoke("set_relay", { pin: 17, state: true });
            setProcessArea(<ProcessStatus tipo={"Funcionário"} funcionario={item}/>);
          }
        } else if (qrdata.type === "resident") {
          checkValidation = await validateResident(item.id, item.status);
          tile.subtitle = item.nome || "n/a";
          tile.status = checkValidation ? <CheckCheck color="green" size={20}/> : <AlertCircle color="yellow" size={20}/>;
          if (checkValidation) {
            await invoke("set_relay", { pin: 17, state: true });
            setProcessArea(<ProcessStatus tipo={"Morador"} morador={item}/>);
          }
        } else if (qrdata.type === "vehicle") {
          checkValidation = await validateVehicle(
            item.id,
            item.motoristas?.[0]?.id,
            item.situation
          );
          tile.subtitle = item.matricula || "n/a";
          tile.status = checkValidation ? <CheckCheck color="green" size={20}/> : <AlertCircle color="yellow" size={20}/>;
          if (checkValidation) {
            await invoke("set_relay", { pin: 17, state: true });
            setProcessArea(<ProcessStatus tipo={"Veículo"} veiculo={item}/>);
          }
        } else if (qrdata.type === "visitor") {
          checkValidation = await validateVisitor(qrdata.code);
          tile.subtitle = item.nome || "n/a";
          tile.status = checkValidation ? <CheckCheck color="green" size={20}/> : <AlertCircle color="yellow" size={20}/>;
          if (checkValidation) {
            await invoke("set_relay", { pin: 17, state: true });
            setProcessArea(<ProcessStatus tipo={"Visitante"} visitor={item}/>);
          }
        }
      } else {
        if (message === "Processando...") message = "Desconhecido";
        tile.title = message;
        tile.subtitle = "Negado";
        tile.status = <AlertCircle color="yellow" size={20}/>;
      }

      // Atualiza lista
      setProcessList((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = tile;
        return updated;
      });

    } catch (e) {
      setProcessList((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last) {
          last.title = "Desconhecido";
          last.subtitle = "Negado";
          last.status = <AlertCircle color="yellow" size={20}/>;
        }
        return updated;
      });
    }
  };


  const check = useCallback(async (qrdata: Record<string, any>) => {
    let route = "";
    let param = "";

    if (qrdata.code) {
      param = `?code=${qrdata.code}`;
      route = `/v1/concierge/check/visitor/1${param}`;
    } else {
      param = `?id=${qrdata.id}&type=${qrdata.type}&code=${qrdata.code}`;
      route = `/v1/concierge/check/qrcode/1${param}`;
    }

    try {
      const res = await new Http().get(route, { headers: true });
      return res;
    } catch (e: any) {
      console.error(`Erro de conexão: ${e.message}`);
    }
  }, [condominioId]);

  const validateResident = useCallback(async (id: string, status: string) =>{
    const route = `/v1/concierge/valid/resident/${condominioId}`;

    try {
      const res = await new Http().post(`${route}?id=${id}&status=${status}`,{ headers: true });
      return res.status === 200;
    } catch {
      return false;
    }
  }, [condominioId]);

  const validateEmployee = useCallback(async (id: string, situation: string) => {
    const route = `/v1/concierge/valid/employee/${condominioId}`;

    try {
      const res = await new Http().post(`${route}?id=${id}&situation=${situation}`,{ headers: true });
      return res.status === 200;
    } catch {
      return false;
    }
  }, [condominioId]);

  const validateVehicle = useCallback(async (id: string, motoristaId: string, status: string) =>{
    const route = `/v1/concierge/viatura/${condominioId}`;

    try {
      const res = await new Http().post(`${route}?id=${id}&status=${status}&motoristaId=${motoristaId}`,{ headers: true });
      return res.status === 200;
    } catch {
      return false;
    }
  }, [condominioId]);

  const validateVisitor = useCallback(async (code: string) =>{
    const params = new URLSearchParams({
      code,
      is_accompanied: "0",
      number_companions: "0",
      came_by_car: "0",
      plate: "n/a",
      obs: "n/a",
    });

    const route = `/v1/concierge/valid/visitor/${condominioId}`;

    try {
      const res = await new Http().post(`${route}?${params.toString()}`,{ headers: true });
      return res.status === 200;
    } catch (e) {
      console.error(e);
      return false;
    }
  }, [condominioId]);

  return ( 
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Toaster/>
      {loading 
      ? 
        <div className="flex flex-col items-center justify-center h-screen w-screen gap-2">
          <Loader2Icon className="animate-spin" size={50}/>
          <p className="font-medium">Carregando...</p>
        </div> 
      : !asLogin 
        ? 
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center h-screen w-screen gap-2">
            <Loader2Icon className="animate-spin" size={50}/>
            <p className="font-medium">Carregando...</p>
          </div>
        }>
          <Login setAsLogin={setAsLogin}/>
        </Suspense>
        :
        <UserProvider userData={isAuthenticated() as userModel}>
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center h-full w-full gap-2">
              <Loader2Icon className="animate-spin" size={50}/>
              <p className="font-medium">Carregando...</p>
            </div>
            }>
            <main className="flex h-dvh w-dvw items-stretch gap-3 p-3">

              <Card className="h-full w-[150px] p-0">
                <div className="h-full flex flex-col justify-between p-3">
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="b-0 cursor-pointer flex flex-col h-auto" variant={'outline'}><HelpingHand/> Check</Button>                    
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Check</DialogTitle>
                        <DialogDescription>
                        
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="b-0 cursor-pointer flex flex-col h-auto" variant={'outline'}><Cog/> Configurações</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configurações</DialogTitle>
                        <DialogDescription>
                        
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
                </div>
              </Card>

              <Card className="h-full w-full flex-1">
                <div className="flex w-full h-full items-center justify-center">
                  {processArea == undefined ? <img style={{width: '280px'}} src="empty.png"/> : processArea}
                </div>
              </Card>

              <Card className="h-full w-[220px] p-0 overflow-hidden">
                <div className="flex flex-col max-w-full h-full max-h-full overflow-hidden">
                  
                  <div className="flex flex-row items-center gap-2 p-3 max-w-full">
                    <span>
                      <div
                      onClick={()=>{
                          if (!socket) return;

                          if (connected) {
                              socket.disconnect();
                          } else {
                              socket.connect();
                          }
                      }} 
                      className={`cursor-pointer ${connected ? 'socket-on pulse-on' : 'socket-off pulse-off'}`}>
                          {connected ? 'ON' : 'OFF'}
                      </div>
                    </span>
                    <div className="w-full max-w-[75%] flex flex-col">
                      <p className="overflow-hidden truncate" style={{fontSize: '.8em'}}>ID: {socket?.id ?? 'n/a'}</p>
                      <p className="overflow-hidden truncate" style={{fontSize: '.8em'}}>Code: {socket?.id ?? 'n/a'}</p>
                    </div>
                  </div>

                  <div style={{background: "black"}} className="flex-1 flex items-center gap-2 p-3 font-semibold justify-between">
                    <p style={{fontSize: '14px'}}>Condomínios</p>
                    <div className="flex gap-2 justify-end">
                      <Button onClick={()=>getCondominios()} className="b-0 cursor-pointer" variant={'outline'}><RefreshCcw/></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="b-0 cursor-pointer" variant={'outline'}><LogOut/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Pretende mesmo terminar a sessão?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja sair?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={()=>{
                              const Cookies = new cookies();
                              Cookies.setCookie('access_token', '', -1);
                              setAsLogin(false);
                            }}>Continue</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="h-full">
                    {loadingCondominio 
                      ? 
                      <div className="flex flex-col items-center justify-center w-full gap-2 p-3">
                        <Loader2Icon className="animate-spin" size={50}/>
                      </div>
                      : 
                      <div className="flex flex-col gap-2 overflow-y-auto h-full">
                        {condominios.map((condominio, index) => (
                          <div key={index}>
                          <div onClick={()=>setCondominioId(condominio.id)} className={`${condominio.id == condominioId && 'dark:bg-gray-700'} condo-list cursor-pointer w-full flex justify-between items-center gap-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700`}>
                            <div>
                              <p className="font-semibold" style={{fontSize: '14px'}}>{condominio.nome}</p>
                              <p style={{fontSize: '14px'}}>{condominio.telefone}</p>
                            </div>
                            <ChevronRight/>
                          </div>
                          <Separator/>
                          </div>
                        ))}
                      </div>
                    }
                  </div>

                  <div style={{background: "black"}} className="flex-1 flex items-center gap-2 p-3 font-semibold justify-between">
                    <p style={{fontSize: '14px'}}>Processos ({processList.length})</p>
                  </div>

                  <div className="h-full overflow-y-auto">
                    {processList.length > 0 
                      ? 
                      <div className="flex flex-col overflow-y-auto h-full">
                        {[...processList].reverse().map((item, index) => (
                          <div key={index}>
                            <div className="condo-list flex justify-between items-center gap-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700">
                              <div>
                                <p className="font-semibold" style={{ fontSize: '14px' }}>{item.title}</p>
                                <p style={{ fontSize: '14px' }}>{item.subtitle}</p>
                              </div>
                              {item.status}
                            </div>
                            <Separator />                            
                          </div>
                        ))}
                      </div>
                      : 
                      <div className="flex flex-col items-center justify-center w-full gap-2 p-3">
                        <p style={{fontSize: '14px'}}>Nenhum processo iniciado</p>
                      </div>
                    }
                  </div>
                  
                  <Separator/>
                  <div className="p-3">
                    <p style={{fontSize: '14px'}} className="text-center font-semibold">Control JP</p>
                  </div>

                </div>
              </Card> 
            </main>
            </Suspense>
        </UserProvider>
        }
    </ThemeProvider>
  );
}

export default App;
