import { reducerTester } from '../../../../test/core/redux/reducerTester';
import {
  clearDashboard,
  DashboardSource,
  DataSourceInput,
  importDashboardReducer,
  ImportDashboardState,
  initialImportDashboardState,
  InputType,
  setGcomDashboard,
  setInputs,
  setJsonDashboard,
} from './reducers';

describe('importDashboardReducer', () => {
  describe('when setGcomDashboard action is dispatched', () => {
    it('then resulting state should be correct', () => {
      reducerTester<ImportDashboardState>()
        .givenReducer(importDashboardReducer, { ...initialImportDashboardState })
        .whenActionIsDispatched(
          setGcomDashboard({ json: { id: 1, title: 'Imported' }, updatedAt: '2001-01-01', orgName: 'Some Org' })
        )
        .thenStateShouldEqual({
          ...initialImportDashboardState,
          dashboard: {
            title: 'Imported',
            id: null,
          },
          meta: { updatedAt: '2001-01-01', orgName: 'Some Org' },
          source: DashboardSource.Gcom,
          isLoaded: true,
        });
    });
  });

  describe('when setJsonDashboard action is dispatched', () => {
    it('then resulting state should be correct', () => {
      reducerTester<ImportDashboardState>()
        .givenReducer(importDashboardReducer, { ...initialImportDashboardState, source: DashboardSource.Gcom })
        .whenActionIsDispatched(setJsonDashboard({ id: 1, title: 'Imported' }))
        .thenStateShouldEqual({
          ...initialImportDashboardState,
          dashboard: {
            title: 'Imported',
            id: null,
          },
          source: DashboardSource.Json,
          isLoaded: true,
        });
    });
  });

  describe('when clearDashboard action is dispatched', () => {
    it('then resulting state should be correct', () => {
      reducerTester<ImportDashboardState>()
        .givenReducer(importDashboardReducer, {
          ...initialImportDashboardState,
          dashboard: {
            title: 'Imported',
            id: null,
          },
          isLoaded: true,
        })
        .whenActionIsDispatched(clearDashboard())
        .thenStateShouldEqual({
          ...initialImportDashboardState,
          dashboard: {},
          isLoaded: false,
        });
    });
  });

  describe('when setInputs action is dispatched', () => {
    it('then resulting state should be correct', () => {
      reducerTester<ImportDashboardState>()
        .givenReducer(importDashboardReducer, { ...initialImportDashboardState })
        .whenActionIsDispatched(
          setInputs([{ type: InputType.DataSource }, { type: InputType.Constant }, { type: 'temp' }])
        )
        .thenStateShouldEqual({
          ...initialImportDashboardState,
          inputs: {
            dataSources: [{ type: InputType.DataSource }] as DataSourceInput[],
            constants: [{ type: InputType.Constant }] as DataSourceInput[],
          },
        });
    });
  });
});