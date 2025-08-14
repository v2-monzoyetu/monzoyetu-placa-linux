import React from "react";

interface Veiculo {
    categoria: string;
    quadra: string;
    subCategoria: string;
    lote: string;
    matricula: string;
    marca: string;
    modelo: string;
    motoristas: { nome: string }[];
}

interface Morador {
    foto?: string;
    nome: string;
    categoria: string;
    quadra: string;
    sub_categoria: string;
    lote: string;
}

interface Funcionario extends Morador {}

interface Visitante {
    nome: string;
    categoria: string;
    quadra: string;
    sub_categoria: string;
    lote: string;
    status: string;
}

interface ProcessStatusProps {
    tipo: "Veículo" | "Morador" | "Funcionário" | "Visitante";
    veiculo?: Veiculo;
    morador?: Morador;
    funcionario?: Funcionario;
    visitor?: Visitante;
    imageLink?: string;
}

export const ProcessStatus: React.FC<ProcessStatusProps> = ({
    tipo,
    veiculo,
    morador,
    funcionario,
    visitor,
    imageLink = "https://painel.monzoyetu.com",
}) => {
    const style: React.CSSProperties = { fontSize: 30, textAlign: "center" };

    if (tipo === "Veículo" && veiculo) {
        return (
        <div style={{ textAlign: "center" }}>
            <div style={style}>{tipo}</div>
            <div style={style}>
            {veiculo.categoria}: {veiculo.quadra} - {veiculo.subCategoria}: {veiculo.lote}
            </div>
            <div style={style}>Matrícula: {veiculo.matricula}</div>
            <div style={style}>
            Marca: {veiculo.marca} | Modelo: {veiculo.modelo}
            </div>
            <div style={style}>Motorista: {veiculo.motoristas[0]?.nome}</div>
        </div>
        );
    }

    if (tipo === "Morador" && morador) {
        return (
        <div style={{ textAlign: "center" }}>
            <img
            src={`${imageLink}/storage/resident/${morador.foto || "default.png"}`}
            style={{ borderRadius: "50%", objectFit: "cover", width: '250px', height: '250px'}}
            />
            <div style={style}>{tipo}</div>
            <div style={style}>{morador.nome}</div>
            <div style={style}>
            {morador.categoria}: {morador.quadra} - {morador.sub_categoria}: {morador.lote}
            </div>
        </div>
        );
    }

    if (tipo === "Funcionário" && funcionario) {
        return (
        <div style={{ textAlign: "center" }}>
            <img
            src={`${imageLink}/storage/employees/${funcionario.foto || "default.png"}`}
            style={{ borderRadius: "50%", objectFit: "cover", width: '250px', height: '250px'}}
            />
            <div style={style}>{tipo}</div>
            <div style={style}>{funcionario.nome}</div>
            <div style={style}>
            {funcionario.categoria}: {funcionario.quadra} - {funcionario.sub_categoria}: {funcionario.lote}
            </div>
        </div>
        );
    }

    if (tipo === "Visitante" && visitor) {
        return (
        <div style={{ textAlign: "center" }}>
            <div style={style}>{tipo}</div>
            <div style={style}>{visitor.nome}</div>
            <div style={style}>
            {visitor.categoria}: {visitor.quadra} - {visitor.sub_categoria}: {visitor.lote}
            </div>
            <div style={style}>{visitor.status === "2" ? "Entrada" : "Saída"}</div>
        </div>
        );
    }

    return undefined;
};
