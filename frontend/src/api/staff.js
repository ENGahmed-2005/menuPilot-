import { api } from './client';
export const getStaff=()=>api.get('/staff');
export const createStaff=(payload)=>api.post('/staff',payload);
export const updateStaff=(id,payload)=>api.put(`/staff/${id}`,payload);
export const deleteStaff=(id)=>api.delete(`/staff/${id}`);
