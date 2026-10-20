const PATHS = {
  glass: 'M8 3h8l-.6 6.2A3.5 3.5 0 0 1 12 12.5a3.5 3.5 0 0 1-3.4-3.3L8 3Zm4 9.5V20m-3.5 0h7',
  bottles: 'M7 3h2v3l1.5 2.5V21h-5V8.5L7 6V3Zm8 0h2v3l1.5 2.5V21h-5V8.5L15 6V3Z',
  plus: 'M12 5v14M5 12h14',
  upload: 'M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4.5 15v4.5h15V15',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm4.6-1.9L20 20',
}

export type IconName = keyof typeof PATHS

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  )
}
