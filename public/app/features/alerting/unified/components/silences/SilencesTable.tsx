import React, { FC, useMemo, useCallback } from 'react';
import { GrafanaTheme2, dateMath } from '@grafana/data';
import { Icon, useStyles2, Link, Button } from '@grafana/ui';
import { css } from '@emotion/css';
import { AlertmanagerAlert, Silence } from 'app/plugins/datasource/alertmanager/types';
import { NoSilencesSplash } from './NoSilencesCTA';
import { makeAMLink } from '../../utils/misc';
import { contextSrv } from 'app/core/services/context_srv';
import { useQueryParams } from 'app/core/hooks/useQueryParams';
import { DynamicTable, DynamicTableColumnProps, DynamicTableItemProps } from '../DynamicTable';
import { SilenceStateTag } from './SilenceStateTag';
import { Matchers } from './Matchers';
import { ActionButton } from '../rules/ActionButton';
import { ActionIcon } from '../rules/ActionIcon';
import { useDispatch } from 'react-redux';
import { expireSilenceAction } from '../../state/actions';
import { SilenceDetails } from './SilenceDetails';

export interface SilenceTableItem extends Silence {
  silencedAlerts: AlertmanagerAlert[];
}

type SilenceTableColumnProps = DynamicTableColumnProps<SilenceTableItem>;
type SilenceTableItemProps = DynamicTableItemProps<SilenceTableItem>;
interface Props {
  silences: Silence[];
  alertManagerAlerts: AlertmanagerAlert[];
  alertManagerSourceName: string;
}

const SilencesTable: FC<Props> = ({ silences, alertManagerAlerts, alertManagerSourceName }) => {
  const styles = useStyles2(getStyles);
  const [queryParams] = useQueryParams();

  const filteredSilences = useMemo(() => {
    const silenceIdsString = queryParams?.silenceIds;
    if (typeof silenceIdsString === 'string') {
      return silences.filter((silence) => silenceIdsString.split(',').includes(silence.id));
    }
    return silences;
  }, [queryParams, silences]);

  const findSilencedAlerts = useCallback(
    (id: string) => {
      return alertManagerAlerts.filter((alert) => alert.status.silencedBy.includes(id));
    },
    [alertManagerAlerts]
  );

  const columns = useColumns(alertManagerSourceName);

  const items = useMemo((): SilenceTableItemProps[] => {
    return filteredSilences.map((silence) => {
      const silencedAlerts = findSilencedAlerts(silence.id);
      return {
        id: silence.id,
        data: { ...silence, silencedAlerts },
      };
    });
  }, [filteredSilences, findSilencedAlerts]);

  return (
    <>
      {!!silences.length && (
        <>
          {contextSrv.isEditor && (
            <div className={styles.topButtonContainer}>
              <Link href={makeAMLink('/alerting/silence/new', alertManagerSourceName)}>
                <Button className={styles.addNewSilence} icon="plus">
                  New Silence
                </Button>
              </Link>
            </div>
          )}
          <DynamicTable
            items={items}
            cols={columns}
            isExpandable
            renderExpandedContent={({ data }) => <SilenceDetails silence={data} />}
          />
          <div className={styles.callout}>
            <Icon className={styles.calloutIcon} name="info-circle" />
            <span>Expired silences are automatically deleted after 5 days.</span>
          </div>
        </>
      )}
      {!silences.length && <NoSilencesSplash alertManagerSourceName={alertManagerSourceName} />}
    </>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  topButtonContainer: css`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
  `,
  addNewSilence: css`
    margin-bottom: ${theme.spacing(1)};
  `,
  callout: css`
    background-color: ${theme.colors.background.secondary};
    border-top: 3px solid ${theme.colors.info.border};
    border-radius: 2px;
    height: 62px;
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-top: ${theme.spacing(2)};

    & > * {
      margin-left: ${theme.spacing(1)};
    }
  `,
  calloutIcon: css`
    color: ${theme.colors.info.text};
  `,
  editButton: css`
    margin-left: ${theme.spacing(0.5)};
  `,
});

function useColumns(alertManagerSourceName: string) {
  const dispatch = useDispatch();
  const styles = useStyles2(getStyles);
  return useMemo((): SilenceTableColumnProps[] => {
    const handleExpireSilenceClick = (id: string) => {
      dispatch(expireSilenceAction(alertManagerSourceName, id));
    };
    const showActions = contextSrv.isEditor;
    const columns: SilenceTableColumnProps[] = [
      {
        id: 'state',
        label: 'State',
        renderCell: function renderStateTag({ data: { status } }) {
          return <SilenceStateTag state={status.state} />;
        },
        size: '88px',
      },
      {
        id: 'matchers',
        label: 'Matching labels',
        renderCell: function renderMatchers({ data: { matchers } }) {
          return <Matchers matchers={matchers || []} />;
        },
        size: 9,
      },
      {
        id: 'alerts',
        label: 'Alerts',
        renderCell: ({ data: { silencedAlerts } }) => silencedAlerts.length,
        size: 1,
      },
      {
        id: 'schedule',
        label: 'Schedule',
        renderCell: function renderSchedule({ data: { startsAt, endsAt } }) {
          const startsAtDate = dateMath.parse(startsAt);
          const endsAtDate = dateMath.parse(endsAt);
          const dateDisplayFormat = 'YYYY-MM-DD HH:mm';
          return (
            <>
              {' '}
              {startsAtDate?.format(dateDisplayFormat)} {'-'}
              <br />
              {endsAtDate?.format(dateDisplayFormat)}
            </>
          );
        },
        size: 2,
      },
    ];
    if (showActions) {
      columns.push({
        id: 'actions',
        label: 'Actions',
        renderCell: function renderActions({ data: silence }) {
          return (
            <>
              {silence.status.state === 'expired' ? (
                <Link href={makeAMLink(`/alerting/silence/${silence.id}/edit`, alertManagerSourceName)}>
                  <ActionButton icon="sync">Recreate</ActionButton>
                </Link>
              ) : (
                <ActionButton icon="bell" onClick={() => handleExpireSilenceClick(silence.id)}>
                  Unsilence
                </ActionButton>
              )}
              {silence.status.state !== 'expired' && (
                <ActionIcon
                  className={styles.editButton}
                  to={makeAMLink(`/alerting/silence/${silence.id}/edit`, alertManagerSourceName)}
                  icon="pen"
                  tooltip="edit"
                />
              )}
            </>
          );
        },
        size: 2,
      });
    }
    return columns;
  }, [alertManagerSourceName, dispatch, styles]);
}

export default SilencesTable;
