import { CATEGORIES, type CategoryId } from '@/constants/categories'
import { CATEGORY_ICON_MAP } from '@/assets/icons/CategoryIcons'
import { CategoryIconButton } from './CategoryIconButton'
import { color } from '@/constants'

interface Props {
  active: CategoryId
  onChange: (id: CategoryId) => void
}

export function CategoryTabs({ active, onChange }: Props) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: 5,
          padding: '0 20px',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x proximity',
          width: '100%',
        }}
      >
        {CATEGORIES.map((cat) => (
          <CategoryIconButton
            key={cat.id}
            label={cat.label}
            icon={CATEGORY_ICON_MAP[cat.id]}
            active={active === cat.id}
            onClick={() => onChange(cat.id)}
          />
        ))}
      </div>

      {/* Right edge gradient fade (Figma: linear-gradient -89.99deg white 22.5% → transparent) */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 56,
          height: 67,
          background: `linear-gradient(270deg, ${color.sheet.bg} 22.5%, rgba(255,255,255,0) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
