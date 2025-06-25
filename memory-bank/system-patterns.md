# System Patterns

## Architecture Patterns

### Component Structure
- **Panel-based UI**: Each major function (signatures, equipment review, analytics) has dedicated panel components
- **Modal System**: Edit/create operations use modal overlays for focused interactions
- **State Management**: Centralized Zustand store with typed actions and selectors

### Data Flow Pattern
```
BACnet Data → Normalization Engine → Signature Matching → UI Display
                     ↓
              Abbreviation Dictionary → Vendor-Specific Rules → Confidence Scoring
```

### Normalization Engine Pattern
- **Multi-pass Processing**: Vendor-specific → Standard abbreviations → Contextual prefixes
- **Caching Strategy**: Memoized results with performance monitoring
- **Confidence Calculation**: Multi-factor scoring including pattern matching and equipment context

## Code Patterns

### Component Props Pattern
```typescript
interface ComponentProps {
  data: TypedData;
  onAction: (id: string) => void;
  analytics?: AnalyticsData;
  isSelected?: boolean;
}
```

### Query Hook Pattern
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => fetchResource(id),
  enabled: !!prerequisite,
});
```

### State Update Pattern
```typescript
// Zustand store actions
const useAppStore = create<State>()((set, get) => ({
  updateSignature: (id, updates) => 
    set(state => ({
      signatures: state.signatures.map(sig => 
        sig.id === id ? { ...sig, ...updates } : sig
      )
    }))
}));
```

### Display List Pattern
```typescript
// Recent improvement: Vertical bullet lists instead of truncated horizontal
<ul className="list-disc list-inside space-y-1 ml-6">
  {items.map((item, idx) => (
    <li key={idx} className="text-sm text-gray-700">
      {item.display}
    </li>
  ))}
</ul>
```

## Documentation Patterns

### Memory Bank Structure
- **active-context.md**: Current session tasks and issues
- **progress.md**: Completed work with detailed descriptions
- **decision-log.md**: Implementation choices with alternatives and consequences
- **product-context.md**: High-level project overview and architecture
- **system-patterns.md**: Code and architectural patterns (this file)

### Naming Conventions
- **Components**: PascalCase with descriptive suffixes (Panel, Modal, Display)
- **Hooks**: camelCase starting with 'use'
- **Types/Interfaces**: PascalCase, often ending with descriptive suffix
- **Files**: kebab-case for utilities, PascalCase for components