import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import cookies from "@/helper/cookies";
import { Http } from "@/helper/Http";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

export default function Login ({setAsLogin}:{setAsLogin: React.Dispatch<React.SetStateAction<boolean|undefined>>}) {
    const [loading, setLoading]   = useState<boolean>(false)
    const [phone, setPhone]       = useState<string>('')
    const [password, setPassword] = useState<string>('')

    async function login(e: React.FormEvent<HTMLFormElement>){
        e.preventDefault()
        if(phone.trim() == ''){
            document.getElementById('phone')?.focus()
            toast.error('Insira o seu contacto telefônico!');
            return;
        }else if(password.trim().length < 6){
            document.getElementById('password')?.focus()
            toast.error('A senha deve ter no mínimo 6 caracteres!');
            return;
        }
        
        setLoading(true)

        try {
        new Http().post('/concierge/auth/login', {
        body: {
            telefone: phone.trim(),
            password: password.trim(),
        }
        }).then(res =>{
            if(res.status == 200){
                const Cookies = new cookies();
                toast.success('Login efetuado com sucesso.');
                const data = res.body as {access_token: string, token_type: string, expires_in: number};
                setTimeout(() => {
                    Cookies.setCookie('access_token', data.access_token, 1000);
                    setAsLogin(true);
                }, 1000);
            }else{
                toast.error('Login falhou! Verifique as credenciais.');
            }
            setLoading(false)
        })
        
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error(message)
            setLoading(false)
        }
    }
    
    return(
        <div className="flex w-full flex-col justify-center items-center h-screen bg-background">
            <form onSubmit={login} className="flex flex-col gap-4 w-[350px] mx-auto md:max-w-[450px]">
                
                <h1 className="text-[32px] font-bold">MonzoYetu Portaria</h1>
                
                <Label htmlFor="phone">Telefone</Label>
                <Input 
                id="phone" 
                type="phone" 
                name="phone"
                autoComplete="on" 
                value={phone}
                disabled={loading} 
                onChange={(e)=>{setPhone(e.target.value)}} 
                placeholder="Contacto telefónico"/>

                <Label htmlFor="password">Senha</Label>
                <Input 
                value={password}
                disabled={loading} 
                onChange={(e)=>{setPassword(e.target.value)}} 
                autoComplete="on" 
                id="password" 
                type={`password`} 
                name="password" 
                placeholder="Insira a sua senha"/>                  

                <Button className="cursor-pointer" variant={'default'} disabled={loading} type="submit">
                {loading && (
                    <Loader2Icon className="animate-spin"/>
                )} Entrar
                </Button>
            </form>                
        </div>
    )
};