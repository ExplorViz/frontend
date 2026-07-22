import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import { FqnFilterOption } from 'explorviz-frontend/src/stores/entity-filtering-store';
import Form from 'react-bootstrap/Form';
import CreatableSelect from 'react-select/creatable';

export type { FqnFilterOption };

const EXAMPLE_INCLUSION_EXPRESSIONS: FqnFilterOption[] = [
  { value: 'com/example/**', label: 'com/example/**' },
  { value: 'com/*/service/*', label: 'com/*/service/*' },
  { value: 'regex:.*.java', label: 'regex:.*.java' },
];

const EXAMPLE_EXCLUSION_EXPRESSIONS: FqnFilterOption[] = [
  { value: '**/test/**', label: '**/test/**' },
  { value: 'regex:.*Test.java', label: 'regex:.*Test.java' },
];

function FormLabelWithHelp({ label, help }: { label: string; help: string }) {
  return (
    <Form.Label className="d-flex align-items-center mb-1">
      {label}
      <HelpTooltip title={help} placement="top" />
    </Form.Label>
  );
}

interface FqnFilteringProps {
  readonly inclusionExpressions: readonly FqnFilterOption[];
  readonly exclusionExpressions: readonly FqnFilterOption[];
  readonly onInclusionChange: (expressions: readonly FqnFilterOption[]) => void;
  readonly onExclusionChange: (expressions: readonly FqnFilterOption[]) => void;
}

export default function FqnFiltering({
  inclusionExpressions,
  exclusionExpressions,
  onInclusionChange,
  onExclusionChange,
}: FqnFilteringProps) {
  return (
    <>
      <Form.Group className="mb-3">
        <FormLabelWithHelp
          label="Inclusion Search Expressions"
          help="Limit visible buildings to those whose fully qualified name (FQN) matches at least one expression. Use glob patterns with '/' as separator (e.g. com/example/**), or prefix with 'regex:' for regular expressions. If empty, all buildings are included."
        />
        <CreatableSelect<FqnFilterOption, true>
          isMulti
          options={EXAMPLE_INCLUSION_EXPRESSIONS}
          value={inclusionExpressions}
          onChange={(newValue) => onInclusionChange(newValue)}
          getNewOptionData={(inputValue) => ({
            value: inputValue,
            label: inputValue,
          })}
          placeholder="Include all"
          noOptionsMessage={() => 'Type an expression or select a default...'}
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <FormLabelWithHelp
          label="Exclusion Search Expressions"
          help="Hide or remove buildings whose FQN matches any expression. Use glob patterns with '/' as separator, or prefix with 'regex:' for regular expressions. If empty, no buildings are excluded by FQN."
        />
        <CreatableSelect<FqnFilterOption, true>
          isMulti
          options={EXAMPLE_EXCLUSION_EXPRESSIONS}
          value={exclusionExpressions}
          onChange={(newValue) => onExclusionChange(newValue)}
          getNewOptionData={(inputValue) => ({
            value: inputValue,
            label: inputValue,
          })}
          placeholder="Exclude none"
          noOptionsMessage={() => 'Type an expression or select a default...'}
        />
      </Form.Group>
    </>
  );
}
