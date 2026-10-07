import { boardReducer, createBoardState, createWidget, MAX_UNDO } from '@/lib/board';
import { WidgetConfig } from '@/types/fidget';

const widget = (id: string, overrides: Partial<WidgetConfig> = {}): WidgetConfig => ({
  id,
  type: 'press-hold',
  x: 0.5,
  y: 0.5,
  rotation: 0,
  label: 'Press & Hold',
  ...overrides,
});

describe('boardReducer', () => {
  it('keeps every field of a saved widget when a board is loaded', () => {
    const saved = [widget('a', { x: 0.2, y: 0.8, rotation: 90, scale: 1.5, locked: true })];
    expect(createBoardState(saved).widgets).toEqual(saved);
  });

  it('records one undo step per change and undoes in order', () => {
    let state = createBoardState([widget('a')]);
    state = boardReducer(state, { type: 'update', id: 'a', changes: { x: 0.1, y: 0.2 } });
    state = boardReducer(state, { type: 'update', id: 'a', changes: { rotation: 45 } });
    expect(state.past).toHaveLength(2);

    state = boardReducer(state, { type: 'undo' });
    expect(state.widgets[0]).toMatchObject({ x: 0.1, y: 0.2, rotation: 0 });
    state = boardReducer(state, { type: 'undo' });
    expect(state.widgets[0]).toMatchObject({ x: 0.5, y: 0.5 });
    expect(boardReducer(state, { type: 'undo' })).toBe(state);
  });

  it('ignores changes that alter nothing, so undo history stays meaningful', () => {
    const state = createBoardState([widget('a', { rotation: 90 })]);
    expect(boardReducer(state, { type: 'update', id: 'a', changes: { rotation: 90 } })).toBe(state);
    expect(boardReducer(state, { type: 'update', id: 'missing', changes: { x: 0 } })).toBe(state);
    expect(boardReducer(state, { type: 'remove', id: 'missing' })).toBe(state);
    expect(boardReducer(createBoardState([]), { type: 'clear' }).past).toHaveLength(0);
  });

  it('toggles lock and slider flags', () => {
    let state = createBoardState([widget('a')]);
    state = boardReducer(state, { type: 'toggle', id: 'a', key: 'locked' });
    expect(state.widgets[0].locked).toBe(true);
    state = boardReducer(state, { type: 'toggle', id: 'a', key: 'locked' });
    expect(state.widgets[0].locked).toBe(false);
  });

  it('caps undo history', () => {
    let state = createBoardState([widget('a')]);
    for (let i = 1; i <= MAX_UNDO + 10; i++) {
      state = boardReducer(state, { type: 'update', id: 'a', changes: { rotation: i } });
    }
    expect(state.past).toHaveLength(MAX_UNDO);
  });

  it('clear can be undone', () => {
    let state = createBoardState([widget('a'), widget('b')]);
    state = boardReducer(state, { type: 'clear' });
    expect(state.widgets).toEqual([]);
    state = boardReducer(state, { type: 'undo' });
    expect(state.widgets.map(w => w.id)).toEqual(['a', 'b']);
  });
});

describe('createWidget', () => {
  it('creates centered widgets with unique ids', () => {
    const a = createWidget('scroll-wheel', { hapticPower: 'heavy' });
    const b = createWidget('scroll-wheel');
    expect(a).toMatchObject({ type: 'scroll-wheel', x: 0.5, y: 0.5, label: 'Scroll Wheel', hapticPower: 'heavy' });
    expect(a.id).not.toBe(b.id);
  });
});
