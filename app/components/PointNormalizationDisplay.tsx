'use client';
import { BacnetPoint } from '@/interfaces/bacnet';
import { useState } from 'react';

interface PointNormalizationDisplayProps {
  point: BacnetPoint;
  showDetails?: boolean;
  onConfidenceUpdate?: (pointId: string, newConfidence: number) => void;
  searchTerm?: string;
  className?: string;
}

// Utility function to highlight search terms
const highlightText = (text: string, searchTerm?: string) => {
  if (!searchTerm || searchTerm.length < 2) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
    ) : part
  );
};

// Get confidence styling
const getConfidenceStyle = (confidence?: number) => {
  if (!confidence) return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'No Data' };
  if (confidence >= 90) return { bg: 'bg-green-100', text: 'text-green-800', label: `${confidence}%` };
  if (confidence >= 70) return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: `${confidence}%` };
  return { bg: 'bg-red-100', text: 'text-red-800', label: `${confidence}%` };
};

export const PointNormalizationDisplay: React.FC<PointNormalizationDisplayProps> = ({
  point,
  showDetails = false,
  onConfidenceUpdate,
  searchTerm,
  className = ''
}) => {
  const [isEditingConfidence, setIsEditingConfidence] = useState(false);
  const [tempConfidence, setTempConfidence] = useState(point.normalizationConfidence || 0);
  
  const confidenceStyle = getConfidenceStyle(point.normalizationConfidence);

  const handleConfidenceSubmit = () => {
    if (onConfidenceUpdate) {
      onConfidenceUpdate(point.id, tempConfidence);
    }
    setIsEditingConfidence(false);
  };

  return (
    <div className={`point-normalization-display ${className}`}>
      {/* Compact View */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {/* Original Point Name */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500 font-medium">ORIGINAL:</span>
            <span className="font-medium text-gray-800 truncate">
              {highlightText(point.dis, searchTerm)}
            </span>
          </div>
          
          {/* Normalized Name */}
          {point.normalizedName ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 font-medium">NORMALIZED:</span>
              <span className="font-semibold text-blue-800 truncate">
                {highlightText(point.normalizedName, searchTerm)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">NORMALIZED:</span>
              <span className="text-gray-400 italic text-sm">Not normalized</span>
            </div>
          )}
        </div>
        
        {/* Confidence Badge */}
        <div className="flex items-center gap-1 ml-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${confidenceStyle.bg} ${confidenceStyle.text}`}>
            {confidenceStyle.label}
          </span>
          {point.normalizationConfidence && onConfidenceUpdate && (
            <button
              onClick={() => setIsEditingConfidence(!isEditingConfidence)}
              className="text-xs text-gray-500 hover:text-gray-700 p-1"
              title="Adjust confidence"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* Confidence Adjustment Interface */}
      {isEditingConfidence && (
        <div className="mt-3 p-3 bg-gray-50 rounded border">
          <div className="text-xs font-medium text-gray-700 mb-2">Adjust Normalization Confidence:</div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={tempConfidence}
              onChange={(e) => setTempConfidence(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12">{tempConfidence}%</span>
            <button
              onClick={handleConfidenceSubmit}
              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Apply
            </button>
            <button
              onClick={() => setIsEditingConfidence(false)}
              className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Detailed View */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          {/* Haystack Tags */}
          {point.haystackTags && point.haystackTags.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Haystack Tags:</div>
              <div className="flex flex-wrap gap-1">
                {point.haystackTags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Point Properties */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium text-gray-700 mb-1">Basic Properties</div>
              <div className="space-y-1 text-gray-600">
                <div><span className="font-medium">Type:</span> {point.kind}</div>
                {point.unit && <div><span className="font-medium">Unit:</span> {point.unit}</div>}
                <div><span className="font-medium">Writable:</span> {point.writable ? 'Yes' : 'No'}</div>
                <div><span className="font-medium">BACnet Current:</span> {point.bacnetCur}</div>
              </div>
            </div>

            {/* Semantic Metadata */}
            {point.semanticMetadata && (
              <div>
                <div className="font-medium text-gray-700 mb-1">Semantic Analysis</div>
                <div className="space-y-1 text-gray-600">
                  <div>
                    <span className="font-medium">Vendor Specific:</span> 
                    {point.semanticMetadata.vendorSpecific ? ' Yes' : ' No'}
                  </div>
                  <div>
                    <span className="font-medium">Equipment Specific:</span> 
                    {point.semanticMetadata.equipmentSpecific ? ' Yes' : ' No'}
                  </div>
                  {point.semanticMetadata.reasoning && point.semanticMetadata.reasoning.length > 0 && (
                    <div>
                      <span className="font-medium">Reasoning:</span>
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {point.semanticMetadata.reasoning.slice(0, 2).map((reason, idx) => (
                          <li key={idx} className="text-xs">{reason}</li>
                        ))}
                        {point.semanticMetadata.reasoning.length > 2 && (
                          <li className="text-xs text-gray-500">... and {point.semanticMetadata.reasoning.length - 2} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-700 mb-1">Description:</div>
            <div className="text-xs text-gray-600">
              {highlightText(point.bacnetDesc, searchTerm)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Utility component for displaying normalization statistics
interface NormalizationStatsProps {
  points: BacnetPoint[];
  className?: string;
}

export const NormalizationStats: React.FC<NormalizationStatsProps> = ({ 
  points, 
  className = '' 
}) => {
  const stats = {
    total: points.length,
    normalized: points.filter(p => p.normalizedName).length,
    withConfidence: points.filter(p => p.normalizationConfidence).length,
    averageConfidence: points
      .filter(p => p.normalizationConfidence)
      .reduce((sum, p) => sum + (p.normalizationConfidence || 0), 0) / 
      Math.max(1, points.filter(p => p.normalizationConfidence).length),
    highConfidence: points.filter(p => p.normalizationConfidence && p.normalizationConfidence >= 80).length,
    lowConfidence: points.filter(p => p.normalizationConfidence && p.normalizationConfidence < 50).length,
  };

  const normalizationRate = Math.round((stats.normalized / stats.total) * 100);
  const avgConfidence = Math.round(stats.averageConfidence);

  return (
    <div className={`normalization-stats p-3 bg-blue-50 rounded-lg border border-blue-200 ${className}`}>
      <div className="text-sm font-medium text-blue-800 mb-2">Normalization Summary</div>
      <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
        <div>
          <div className="font-medium">Coverage</div>
          <div>{stats.normalized}/{stats.total} points ({normalizationRate}%)</div>
        </div>
        <div>
          <div className="font-medium">Avg. Confidence</div>
          <div>{avgConfidence}% ({stats.withConfidence} points)</div>
        </div>
        <div>
          <div className="font-medium">High Confidence</div>
          <div>{stats.highConfidence} points (≥80%)</div>
        </div>
        <div>
          <div className="font-medium">Low Confidence</div>
          <div>{stats.lowConfidence} points (&lt;50%)</div>
        </div>
      </div>
    </div>
  );
};

export default PointNormalizationDisplay; 