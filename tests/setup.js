import '@testing-library/jest-dom/vitest'

// Stub env vars so modules that read them at import time don't blow up
import.meta.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
import.meta.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
