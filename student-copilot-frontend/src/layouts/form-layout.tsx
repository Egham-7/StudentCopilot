import { Outlet } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { Navigate } from "react-router-dom";
import LoadingPage from "@/components/custom/loading";



export default function FormLayout() {

  const { isLoading, isAuthenticated } = useConvexAuth();


  if (isLoading) {
    return <LoadingPage />
  }

  if (!isAuthenticated) {

    return <Navigate to="/" replace />
  }



  return (

    <div className="flex justify-center items-center w-full h-screen">

      <Outlet />

    </div>
  )
}
