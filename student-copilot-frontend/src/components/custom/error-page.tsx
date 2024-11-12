import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 text-center">
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
        </div>
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Oops! Something went wrong</h1>
        <p className="mx-auto max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          We apologize for the inconvenience. Our team has been notified and is working to resolve the issue.
        </p>
        <div className="flex justify-center">
          <Button asChild className="inline-flex items-center gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Return to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
