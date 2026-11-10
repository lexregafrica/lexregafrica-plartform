'use client'

import { createContext, useContext } from 'react'
import Link from 'next/link'
import { IconFlask } from '@tabler/icons-react'

type MockUser = { name: string; email: string }

const MockUserContext = createContext<MockUser>({ name: 'Admin', email: '' })

export function MockUserProvider({ value, children }: { value: MockUser; children: React.ReactNode }) {
  return <MockUserContext.Provider value={value}>{children}</MockUserContext.Provider>
}

export const useMockUser = () => useContext(MockUserContext)

export function MockBanner({ screen }: { screen: string }) {
  return (
    <div className="note note-warn rise" role="note">
      <IconFlask size={18} stroke={1.75} aria-hidden="true" />
      <p>
        <strong>Mockup — {screen}.</strong> Sample data, no AI calls, nothing is saved.{' '}
        <Link href="/mockups/ai">All AI mockups</Link>
      </p>
    </div>
  )
}
