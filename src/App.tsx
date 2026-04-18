import { Route, Routes, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/app-layout'
import { MortgageCalculatorPage } from './pages/mortgage-calculator-page'
import { RentVsBuyPage } from './pages/rent-vs-buy-page'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<MortgageCalculatorPage />} />
        <Route path="/vergleich" element={<RentVsBuyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
