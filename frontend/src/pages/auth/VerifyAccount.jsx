import { useEffect } from "react";
import { useLogto } from "@logto/react";
import { useNavigate } from "react-router-dom";

export default function VerifyAccount(){
  const { signIn }=useLogto(); const navigate=useNavigate();
  useEffect(()=>{void signIn({redirectUri:`${window.location.origin}/callback`,firstScreen:"sign_in",identifier:["email"]}).catch(()=>navigate("/login",{replace:true}));},[navigate,signIn]);
  return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#F3EFE5]"><p className="text-sm font-bold">جارٍ فتح المصادقة في Logto...</p></main>;
}