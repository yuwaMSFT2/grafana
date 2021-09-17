import React, { useState, useEffect, useMemo } from 'react';
import {
  InlineFieldRow,
  InlineField,
  Input,
  QueryField,
  SlatePrism,
  BracesPlugin,
  TypeaheadInput,
  TypeaheadOutput,
  AsyncSelect,
} from '@grafana/ui';
import { tokenizer } from './syntax';
import Prism from 'prismjs';
import { Node } from 'slate';
import { css } from '@emotion/css';
import { SelectableValue } from '@grafana/data';
import TempoLanguageProvider from './language_provider';
import { TempoDatasource, TempoQuery } from './datasource';
import { debounce } from 'lodash';

interface Props {
  datasource: TempoDatasource;
  query: TempoQuery;
  onChange: (value: TempoQuery) => void;
  onBlur?: () => void;
  onRunQuery: () => void;
}

const PRISM_LANGUAGE = 'tempo';
const durationPlaceholder = 'e.g. 1.2s, 100ms, 500us';
const plugins = [
  BracesPlugin(),
  SlatePrism({
    onlyIn: (node: Node) => node.object === 'block' && node.type === 'code_block',
    getSyntax: () => PRISM_LANGUAGE,
  }),
];

Prism.languages[PRISM_LANGUAGE] = tokenizer;

const NativeSearch = ({ datasource, query, onChange, onBlur, onRunQuery }: Props) => {
  const languageProvider = useMemo(() => new TempoLanguageProvider(datasource), [datasource]);
  const [hasSyntaxLoaded, setHasSyntaxLoaded] = useState(false);
  const [autocomplete] = useState<{
    selectedServiceName: SelectableValue<string> | undefined;
    selectedSpanName: SelectableValue<string> | undefined;
  }>({
    selectedServiceName: undefined,
    selectedSpanName: undefined,
  });

  useEffect(() => {
    const fetchAutocomplete = async () => {
      await languageProvider.start();
      setHasSyntaxLoaded(true);
    };
    fetchAutocomplete();
  }, [languageProvider]);

  const debouncedFetchServiceNameOptions = debounce(
    async () => {
      return await languageProvider.getOptions('service.name');
    },
    500,
    { leading: true, trailing: true }
  );

  const debouncedFetchSpanNameOptions = debounce(
    async () => {
      return await languageProvider.getOptions('name');
    },
    500,
    { leading: true, trailing: true }
  );

  const onTypeahead = async (typeahead: TypeaheadInput): Promise<TypeaheadOutput> => {
    return await languageProvider.provideCompletionItems(typeahead);
  };

  const cleanText = (text: string) => {
    const splittedText = text.split(/\s+(?=([^"]*"[^"]*")*[^"]*$)/g);
    if (splittedText.length > 1) {
      return splittedText[splittedText.length - 1];
    }
    return text;
  };

  const onKeyDown = (keyEvent: React.KeyboardEvent) => {
    if (keyEvent.key === 'Enter' && (keyEvent.shiftKey || keyEvent.ctrlKey)) {
      onRunQuery();
    }
  };

  return (
    <div className={css({ maxWidth: '500px' })}>
      <InlineFieldRow>
        <InlineField label="Service Name" labelWidth={14} grow>
          <AsyncSelect
            menuShouldPortal
            defaultOptions
            loadOptions={debouncedFetchServiceNameOptions}
            value={autocomplete.selectedServiceName}
            onChange={(v) => {
              onChange({
                ...query,
                serviceName: v?.value || undefined,
              });
            }}
            placeholder="Select a service"
            isClearable
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="Span Name" labelWidth={14} grow>
          <AsyncSelect
            menuShouldPortal
            defaultOptions
            loadOptions={debouncedFetchSpanNameOptions}
            value={autocomplete.selectedSpanName}
            onChange={(v) => {
              onChange({
                ...query,
                spanName: v?.value || undefined,
              });
            }}
            placeholder="Select a span"
            isClearable
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="Tags" labelWidth={14} grow tooltip="Values should be in the logfmt format.">
          <QueryField
            additionalPlugins={plugins}
            query={query.search}
            onTypeahead={onTypeahead}
            onBlur={onBlur}
            onChange={(value) => {
              onChange({
                ...query,
                search: value,
              });
            }}
            placeholder="http.status_code=200 error=true"
            cleanText={cleanText}
            onRunQuery={onRunQuery}
            syntaxLoaded={hasSyntaxLoaded}
            portalOrigin="tempo"
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="Min Duration" labelWidth={14} grow>
          <Input
            value={query.minDuration || ''}
            placeholder={durationPlaceholder}
            onChange={(v) =>
              onChange({
                ...query,
                minDuration: v.currentTarget.value,
              })
            }
            onKeyDown={onKeyDown}
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="Max Duration" labelWidth={14} grow>
          <Input
            value={query.maxDuration || ''}
            placeholder={durationPlaceholder}
            onChange={(v) =>
              onChange({
                ...query,
                maxDuration: v.currentTarget.value,
              })
            }
            onKeyDown={onKeyDown}
          />
        </InlineField>
      </InlineFieldRow>
      <InlineFieldRow>
        <InlineField label="Limit" labelWidth={14} grow tooltip="Maximum numbers of returned results">
          <Input
            value={query.limit || ''}
            type="number"
            onChange={(v) =>
              onChange({
                ...query,
                limit: v.currentTarget.value ? parseInt(v.currentTarget.value, 10) : undefined,
              })
            }
            onKeyDown={onKeyDown}
          />
        </InlineField>
      </InlineFieldRow>
    </div>
  );
};

export default NativeSearch;
