import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Header from './components/Header'
import AuthGuard from './components/AuthGuard'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Education from './pages/Education'
import Certifications from './pages/Certifications'
import Experience from './pages/Experience'
import Achievements from './pages/Achievements'
import Verification from './pages/Verification'
import BlockchainVisualizer from './pages/BlockchainVisualizer'
import Admin from './pages/Admin'
import AdminUsers from './pages/AdminUsers'
import { WalletProvider } from './context/WalletContext'
import { ContractProvider } from './context/ContractContext'

function App() {
  return (
    <WalletProvider>
      <ContractProvider>
        <Router>
          <AuthGuard>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/education" element={<Education />} />
                  <Route path="/certifications" element={<Certifications />} />
                  <Route path="/experience" element={<Experience />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/verification" element={<Verification />} />
                  <Route path="/blockchain" element={<BlockchainVisualizer />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                </Routes>
              </main>
              <Toaster position="top-right" />
            </div>
          </AuthGuard>
        </Router>
      </ContractProvider>
    </WalletProvider>
  )
}

export default App