import { useThemePreferences } from './ThemeProvider'

export default function TextSizeControl() {
  const { textSize, setTextSize } = useThemePreferences()
  return <label className="text-size-control">
    <span>Larger text</span>
    <select aria-label="Larger text" value={textSize} onChange={(event) => setTextSize(event.target.value as typeof textSize)}>
      <option value="normal">Normal</option>
      <option value="large">Large</option>
      <option value="extra-large">Extra large</option>
    </select>
  </label>
}
