import React from 'react';
import { TextField } from '@mui/material';
import { CollapsibleSection } from '../CollapsibleSection';
import { InfoDialog } from '../InfoDialog';
import { DEFAULT_EMIT_SKELETON_STRING } from '../../../data/config/promptCardDefaults';

interface Props {
  emitSkeleton: string;
  onEmitSkeletonChange: (value: string) => void;
}

export const EmitSkeletonEditor: React.FC<Props> = ({ emitSkeleton, onEmitSkeletonChange }) => (
  <CollapsibleSection title="Emit & Tagging Skeleton" initiallyExpanded={false}>
    <TextField
      fullWidth
      multiline
      minRows={6}
      label={
        <>
          Emit/Tagging Rules (JSON/Text)
          <InfoDialog
            title="Emit & Tagging Skeleton"
            content={`This section provides the AI with strict rules on how to output structured data (@delta, @digest, @scene) as part of its response.`}
          />
        </>
      }
      value={emitSkeleton}
      onChange={(e) => onEmitSkeletonChange(e.target.value)}
      placeholder={DEFAULT_EMIT_SKELETON_STRING}
    />
  </CollapsibleSection>
);