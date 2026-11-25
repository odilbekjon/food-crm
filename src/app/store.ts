import { configureStore } from '@reduxjs/toolkit'
import data from './slices/data'
import session from './slices/session'

export const store = configureStore({
  reducer: { data, session },
  // Demo baza katta bo'lgani uchun dev tekshiruvlari faqat shu slice uchun o'chiriladi.
  middleware: (getDefault) => getDefault({ immutableCheck: false, serializableCheck: false }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
