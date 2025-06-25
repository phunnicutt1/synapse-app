# Project Overview

## Description
**Synapse App - CxAlloy Equipment-Point Mapper**
Intelligent BACnet data mapping application with advanced analysis capabilities. Provides equipment-specific point normalization, signature management, and automated mapping between raw BACnet data and human-readable Haystack tags.

## Objectives
- Intelligently map BACnet data points to standardized naming conventions
- Provide signature-based equipment templates for consistent mapping
- Support vendor-specific abbreviation handling and normalization
- Enable equipment review and management through intuitive interfaces
- Maintain high confidence scoring for mapping accuracy

## Technologies
- **Frontend:** Next.js 14, React 18, TypeScript
- **Styling:** Tailwind CSS, Custom CSS modules
- **State Management:** Zustand (useAppStore)
- **Data Fetching:** TanStack Query (React Query)
- **BACnet Processing:** Custom normalization engine
- **Standards:** Project Haystack integration

## Architecture
- **Component-based UI** with specialized panels for different equipment types
- **Normalization Engine** with comprehensive abbreviation mappings and vendor-specific rules
- **Signature Management System** for template-based equipment mapping
- **Performance Monitoring** with caching and batch processing capabilities
- **RESTful API** endpoints for equipment, signatures, and mapping operations

## Project Structure
```
synapse-app/
├── app/
│   ├── components/           # React components
│   │   ├── SignatureTemplatesPanel.tsx
│   │   ├── EquipmentReviewPanel.tsx
│   │   ├── EditSignatureModal.tsx
│   │   └── ...
│   ├── api/                  # API routes
│   └── globals.css
├── lib/
│   ├── normalization.ts      # BACnet abbreviation engine
│   ├── analysis.ts          # Equipment analysis logic
│   ├── performance.ts       # Caching and optimization
│   └── ...
├── interfaces/
│   └── bacnet.ts            # TypeScript interfaces
└── hooks/
    └── useAppStore.ts       # Global state management
```

## Key Features
- **Equipment Type Detection** with signature matching
- **Point Normalization** using 80+ BACnet abbreviation mappings
- **Vendor-Specific Rules** for Schneider Electric, Johnson Controls, Honeywell, etc.
- **Signature Management** with template creation and validation
- **Confidence Scoring** for mapping quality assessment
- **Real-time Filtering** and search capabilities