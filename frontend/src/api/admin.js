import { api } from "./client";
export const getAllRestaurants=()=>api.get('/admin/restaurants');
export const overrideRestaurantPlan=(restaurantId,planId)=>api.patch(`/admin/restaurants/${restaurantId}/plan`,{plan:planId});
export const extendRestaurantTrial=(restaurantId,days)=>api.post(`/admin/restaurants/${restaurantId}/trial/extend`,{days});
export const createRestaurant=(payload)=>api.post('/admin/restaurants',payload);
export const updateRestaurant=(restaurantId,payload)=>api.patch(`/admin/restaurants/${restaurantId}`,payload);
export const deleteRestaurant=(restaurantId,confirmEmail)=>api.delete(`/admin/restaurants/${restaurantId}`,{confirm_email:confirmEmail});
export const setOwnerActive=(ownerId,active)=>api.patch(`/admin/owners/${ownerId}/status`,{active});
