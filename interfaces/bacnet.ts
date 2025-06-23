export interface BacnetPoint {
    id: string;
    dis: string;
    bacnetCur: string;
    kind: 'Number' | 'Bool' | 'Str';
    unit?: string;
    writable: boolean;
    bacnetDesc: string;
  }
  
  export interface Connector {
    id: string;
    dis: string;
    connStatus: 'ok' | 'fault' | 'disabled';
    vendorName?: string;
    modelName?: string;
    descriptionFromVendor?: string;
    bacnetDeviceName?: string;
    bacnetDeviceStatus?: string;
    bacnetVersion?: string;
    connState?: string;
    uri?: string;
    additionalDescriptiveFields?: Record<string, string>;
    fullDescription?: string;
  }
  
  export interface EquipmentSource {
    id: string;
    connectorId: string;
    equipmentType: string;
    vendorName?: string;
    modelName?: string;
    points: BacnetPoint[];
    fullDescription?: string;
    bacnetDeviceName?: string;
    bacnetDeviceStatus?: string;
    bacnetVersion?: string;
    connState?: string;
    uri?: string;
    additionalDescriptiveFields?: Record<string, string>;
  }
  
  export interface EquipmentSignature {
    id: string;
    name: string;
    equipmentType: string;
    pointSignature: Pick<BacnetPoint, 'dis' | 'kind' | 'unit'>[];
    source: 'auto-generated' | 'user-validated';
    confidence: number;
    matchingEquipmentIds: string[];
  }
  
  export interface CxAlloyEquipment {
      id: string;
      name: string;
  }
  
  export interface EquipmentMapping {
    id: string;
    cxAlloyEquipmentId: string;
    cxAlloyEquipmentName: string;
    skySparkEquipmentId: string;
    signatureId: string;
    mappedAt: Date;
    mappedBy: string;
  }