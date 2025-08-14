import Cookies from "./cookies";
import { fetch } from "@tauri-apps/plugin-http";

class Http{
    
    host: string;
    constructor(){
        this.host = 'https://painel.monzoyetu.com/api';
    }


    async post(route: string, options?: { headers?: boolean; body?: object | BodyInit; stringify?: boolean }) {
        const { headers, body, stringify = true } = options || {};

        const requestHeaders: HeadersInit = new Headers();
        // Definir Content-Type para JSON, se necessário
        if (stringify) {
            requestHeaders.set('Content-Type', 'application/json');
        }

        // Adicionar token, se necessário
        if (headers) {
            const cookies = new Cookies();
            const token: string | undefined = cookies.getCookie('access_token');
            requestHeaders.set('Authorization', `Bearer ${token!}`);
        }

        try {
        const response = await fetch(`${this.host}${route}`, {
            headers: requestHeaders,
            method: 'POST',
            body: stringify
            ? body
                ? JSON.stringify(body)
                : undefined
            : (body as BodyInit | undefined),
        });

        // Obter o corpo da resposta como JSON
        const responseBody = await response.json();

        // Retornar um objeto com status e corpo
        return {
            status: response.status,
            body: responseBody,
        };
        } catch (err) {
        throw err instanceof Error ? err : new Error('Erro desconhecido na requisição');
        }
    }

    async get(route: string, options?: {headers?: boolean, stringify?: boolean}){
        const { headers, stringify = true } = options || {};

        const requestHeaders: HeadersInit = new Headers();
        // Definir Content-Type para JSON, se necessário
        if (stringify) {
            requestHeaders.set('Content-Type', 'application/json');
        }
        if(headers){
            const cookies = new Cookies();
            const token: string | undefined = cookies.getCookie('access_token');
            requestHeaders.set('Authorization', `Bearer ${token!}`);
        }

        try {
            const response = await fetch(`${this.host+route}`, 
                {
                    headers: requestHeaders,
                    method: 'GET',
                },
            )

            // Obter o corpo da resposta como JSON
            const responseBody = await response.json();

            // Retornar um objeto com status e corpo
            return {
                status: response.status,
                body: responseBody,
            };
        } catch (err) {
            throw err instanceof Error ? err : new Error('Erro desconhecido na requisição');
        }
    }
}

export {Http}