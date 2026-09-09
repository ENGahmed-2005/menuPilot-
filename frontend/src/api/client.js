import { mockRequest } from './mockServer';
const BASE_URL=import.meta.env.VITE_API_BASE_URL||'http://localhost:8000/api';
const USE_MOCKS=import.meta.env.VITE_USE_MOCKS==='true';
const TOKEN_KEY='menupilot_token';
export function getToken(){return localStorage.getItem(TOKEN_KEY)}
export function setToken(token){if(token)localStorage.setItem(TOKEN_KEY,token);else localStorage.removeItem(TOKEN_KEY)}
export async function request(path,options={}){const token=getToken();if(USE_MOCKS)return mockRequest(options.method||'GET',path,options.body,token);const headers={'Content-Type':'application/json',Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...(options.headers||{})};const response=await fetch(`${BASE_URL}${path}`,{...options,headers,body:options.body?JSON.stringify(options.body):undefined});const isJson=response.headers.get('content-type')?.includes('application/json');const data=isJson?await response.json().catch(()=>null):null;if(!response.ok){const error=new Error(data?.message||`Request failed: ${response.status}`);error.status=response.status;error.errors=data?.errors||null;throw error;}return data&&Object.prototype.hasOwnProperty.call(data,'data')?data.data:data;}
export const api={get:p=>request(p,{method:'GET'}),post:(p,b)=>request(p,{method:'POST',body:b}),put:(p,b)=>request(p,{method:'PUT',body:b}),patch:(p,b)=>request(p,{method:'PATCH',body:b}),delete:p=>request(p,{method:'DELETE'})};
