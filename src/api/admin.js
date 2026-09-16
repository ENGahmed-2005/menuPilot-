import { api } from "./client";
export const getAllRestaurants=()=>api.get('/admin/restaurants');
export const overrideRestaurantPlan=(restaurantId,planId)=>api.patch(`/admin/restaurants/${restaurantId}/plan`,{plan:planId});
export const extendRestaurantTrial=(restaurantId,days)=>api.post(`/admin/restaurants/${restaurantId}/trial/extend`,{days});
