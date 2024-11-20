import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import RootLayout from "./layouts/root-layout";
import DashboardLayout from "./layouts/dashboard-layout";

import IndexPage from "./routes";
import SignInPage from "./routes/sign-in";
import SignUpPage from "./routes/sign-up";
import OnboardingFormPage from "./routes/onboarding-form";
import FormLayout from "./layouts/form-layout";
import DashboardPage from "./routes/dashboard";
import ModulePage from "./routes/module-page";
import NotePage from "./routes/note-page";
import LecturesPage from "./routes/lectures-page";
import NotesPage from "./routes/notes-page";
import FlashcardPage from "./routes/flashcard-page";
import FlashcardSetsPage from "./routes/flashcard-sets-page";

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <IndexPage /> },
      { path: "sign-in/*", element: <SignInPage /> },
      { path: "sign-up/*", element: <SignUpPage /> },

      {
        path: "onboarding",
        element: <FormLayout />,
        children: [{ path: "form", element: <OnboardingFormPage /> }],
      },

      {
        path: "dashboard",
        element: <DashboardLayout />,
        children: [
          { path: "home", element: <DashboardPage /> },
          {
            path: "module/:moduleId",
            element: <ModulePage />,
          },
          { path: "note/:noteId", element: <NotePage /> },
          { path: "lectures/:moduleId", element: <LecturesPage /> },
          { path: "notes/:moduleId", element: <NotesPage /> },
          { path: "flashcards/:moduleId", element: <FlashcardSetsPage /> },
          { path: "flashcards/:moduleId/:flashCardSetId", element: <FlashcardPage /> }
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
