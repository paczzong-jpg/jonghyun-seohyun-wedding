import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { AppShell } from "@/components/crm/app-shell"
import { CompaniesPage } from "@/pages/CompaniesPage"
import { ContactsPage } from "@/pages/ContactsPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { PipelinePage } from "@/pages/PipelinePage"
import { QuotesPage } from "@/pages/QuotesPage"
import { TasksPage } from "@/pages/TasksPage"

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </AppShell>
      <Toaster />
    </BrowserRouter>
  )
}
