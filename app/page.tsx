import type { Metadata } from 'next'
import { HomeV2 } from '@/components/landing/home-v2'
import './landing.css'

export const metadata: Metadata = {
  title: 'LexReg Africa — Governance and compliance for Kenyan businesses',
  description: 'Form or bring in your company, keep every register current, never miss a filing, and ask LexReg AI about your own records. Legal work is signed by an advocate.',
}

export default function LandingPage() {
  return <HomeV2 />
}
