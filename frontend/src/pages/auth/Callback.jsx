import { useState } from "react";
import { useHandleSignInCallback, useLogto } from "@logto/react";
import { useNavigate } from "react-router-dom";
import { bootstrap } from "../../api/auth";
import { getRoleHome } from "../../utils/roleHome";

export default function Callback(){
  const navigate=useNavigate(); const {getAccessToken}=useLogto(); const [error,setError]=useState("");
  const {isLoading}=useHandleSignInCallback(async()=>{
    try{
      const accessToken=await getAccessToken();
      const pending=JSON.parse(sessionStorage.getItem("menupilot_pending_signup")||"null");
      const data=await bootstrap({access_token:accessToken,restaurant_name:pending?.restaurantName||"مطعمي",restaurant_type:pending?.restaurantType||null,plan:pending?.plan||"trial"});
      sessionStorage.removeItem("menupilot_pending_signup");
      const returnTo=sessionStorage.getItem("menupilot_login_return"); sessionStorage.removeItem("menupilot_login_return");
      navigate(returnTo||getRoleHome(data?.user?.role),{replace:true});
    }catch(e){console.error(e);setError(e?.message||"تعذر إكمال تسجيل الدخول.");}
  });
  if(isLoading)return <main className="grid min-h-screen place-items-center bg-[#F3EFE5]"><p className="text-sm font-bold">جارٍ إكمال تسجيل الدخول...</p></main>;
  if(error)return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#F3EFE5] p-6"><div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black">تعذر إكمال تسجيل الدخول</h1><p className="mt-3 text-sm leading-7 text-[#B33F32]">{error}</p><button onClick={()=>navigate("/login",{replace:true})} className="mt-6 rounded-full bg-[#EEA122] px-6 py-3 font-black">العودة لتسجيل الدخول</button></div></main>;
  return null;
}