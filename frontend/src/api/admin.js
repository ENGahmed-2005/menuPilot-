import { api } from "./client";
export const getAllRestaurants=()=>api.get('/admin/restaurants');
export const overrideRestaurantPlan=(restaurantId,planId)=>api.patch(`/admin/restaurants/${restaurantId}/plan`,{plan:planId});
export const extendRestaurantTrial=(restaurantId,days)=>api.post(`/admin/restaurants/${restaurantId}/trial/extend`,{days});
export const createRestaurant=(payload)=>api.post('/admin/restaurants',payload);
export const updateRestaurant=(restaurantId,payload)=>api.patch(`/admin/restaurants/${restaurantId}`,payload);
export const deleteRestaurant=(restaurantId,confirmEmail)=>api.delete(`/admin/restaurants/${restaurantId}`,{confirm_email:confirmEmail});
export const setOwnerActive=(ownerId,active)=>api.patch(`/admin/owners/${ownerId}/status`,{active});

// Owners' forgot-password requests (link sent by the admin on WhatsApp)
export const getPasswordRequests = () => api.get("/admin/password-requests");
export const createPasswordLink = (id) => api.post(`/admin/password-requests/${id}/link`);
export const dismissPasswordRequest = (id) => api.post(`/admin/password-requests/${id}/dismiss`);
