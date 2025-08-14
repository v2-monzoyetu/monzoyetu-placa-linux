import cookies from "@/helper/cookies";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp: string) {
  const date = new Date(timestamp);
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
  return formattedDate;
}

export function numberFormat(value: number) {
  const formattedValue = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'AOA' 
  }).format(value);
  return formattedValue;
}

export function isAuthenticated(): false | string {	
  const Cookies = new cookies();
  const token: string | undefined = Cookies.getCookie('access_token');
  try {
    if (token) {
      return token;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}
