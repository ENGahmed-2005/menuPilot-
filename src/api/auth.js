import { api, setToken } from './client';

export async function register(payload){const data=await api.post('/auth/register',{restaurant_name:payload.restaurantName,email:payload.email,password:payload.password,password_confirmation:payload.passwordConfirmation,plan:payload.plan});if(data?.token)setToken(data.token);return data;}
export async function login(payload){const data=await api.post('/auth/login',{email:payload.email,password:payload.password});if(data?.token)setToken(data.token);return data;}
export async function logout(){try{await api.post('/auth/logout')}finally{setToken(null)}}
export async function fetchCurrentUser(){return api.get('/auth/me')}
export async function forgotPassword(payload){return api.post('/auth/forgot-password',{email:payload.email})}
export async function resetPassword(payload){return api.post('/auth/reset-password',{token:payload.token,email:payload.email,password:payload.password,password_confirmation:payload.passwordConfirmation})}
