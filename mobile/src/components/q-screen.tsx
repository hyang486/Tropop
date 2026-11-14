import {
  type ComponentProps,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  type KeyboardEvent,
  LayoutAnimation,
  Pressable,
  type RefreshControlProps,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtFitContext, type ArtFit } from '@/components/art-fit';
import { HandTitle } from '@/components/hand-title';
import { useInlineHeaderTitle } from '@/components/inline-header-title';
import { colors, usePalette } from '@/components/ui';
import { en } from '@/i18n/en';
import { QSCREEN_FLOATING_CLEARANCE } from '@/features/event/qrewing-fab-size';
import { artHidden, keyboardOverlap, revealScrollY, type Span } from '@/lib/keyboard-plan';
import { useHeaderOverlap } from '@/lib/use-header-overlap';

/**
 * Qrew screen scaffold (human rule USER_DECISIONS:168: match Qrew_heytea_UI.pdf). As in Q 01.04:
 * handwritten title at the top of the content with an optional small gray line under it (Q 01.01 "A room for
 * the people you're with."), a scrolling body (cards, art, text) with 24 pt sides and 12 pt gaps, and the
 * screen's actions pinned to the bottom above the home indicator, with an optional caption under them. The nav
 * header keeps only the back button (screens set headerTitle ''). With the keyboard open the pinned actions
 * ride above it (Q 02.01 "Join as guest") and the body scrolls a focused field into view.
 *
 * Keyboard (qa K1/K2): no KeyboardAvoidingView. Its offset came from a layout-time measure, which was wrong in a
 * sheet (K2), and it never scrolled the focused field into view (K1). Instead, at each keyboard move the root is
 * padded by the part of the keyboard on screen (keyboardOverlap: the screen reaches the window bottom, also in a
 * sheet, whose own measures are in sheet space and are never compared with the keyboard's screen coordinates);
 * once the body has its new size, the focused field (plus `keepVisible`, when both fit) is scrolled into view
 * (revealScrollY). One mechanism, so no padding and inset stack up.
 */
export function QScreen({
  title,
  titleUnderline,
  subtitle,
  children,
  actions,
  actionsDivider = false,
  bottom,
  bottomAlign = 'end',
  refreshControl,
  keepVisible,
  revealRef,
  floating,
  background,
  sheet,
  inlineTitle,
}: {
  title?: string;
  /** V1: the pencil underline under the title, on the three root screens only. */
  titleUnderline?: boolean;
  /** Small gray line right under the title. */
  subtitle?: string;
  children?: ReactNode;
  /** Pinned bottom block: buttons, then a caption (QCaption). */
  actions?: ReactNode;
  /**
   * Body content anchored to the bottom of the scroll area, just above the actions (Q 01.04: the art sits
   * directly above Join). Free space goes between children and this block; it scrolls normally on overflow.
   */
  bottom?: ReactNode;
  /** 'center' puts the `bottom` block in the middle of the free space instead (Q 01.01, 02.01, 07.03 art). */
  bottomAlign?: 'end' | 'center';
  refreshControl?: ReactElement<RefreshControlProps>;
  /** Kept in view together with the focused field when both fit (K2: a form's submit button under the fields). */
  keepVisible?: RefObject<ComponentRef<typeof View> | null>;
  /**
   * Opt-in (qa F-EQ1): QScreen fills this with a function that scrolls `target` (plus `extra`, when both fit) into
   * view above the pinned actions, with or without a keyboard (a hardware keyboard sends no keyboard events).
   * Screens that do not pass it behave as before.
   */
  revealRef?: RefObject<QScreenReveal | null>;
  /**
   * Opt-in (spec 10.1 Ask Qrewing): absolutely positioned content over the body, in an area that ends above the
   * pinned actions, so it never covers them. Screens that do not pass it keep the old tree.
   */
  floating?: ReactNode;
  /** Opt-in screen and pinned-actions ground; default is the app background (calendar notebook paper stays on the grid only, UX P2-6). */
  background?: string;
  /** UX2-48: the screen is a pageSheet: `sheet` ground (dark #1C1C1E) and `sheetField` cards and fields. */
  sheet?: boolean;
  /** UX2-59: the title moves into the nav bar on scroll; default on, except on a sheet (pushed sheet-colored screens opt in). */
  inlineTitle?: boolean;
  /** UX2-57: a 0.5 pt top separator on the pinned actions (as Create room's bar) where content scrolls under them. */
  actionsDivider?: boolean;
}) {
  const insets = useSafeAreaInsets();
  // Pad the top by the header overlap ourselves instead of contentInsetAdjustmentBehavior "automatic": that
  // inset is added on top of a body that already fills the frame (flexGrow), so the `bottom` block was pushed
  // under the actions by the header height (qa c-nonmember at 1ab2fd1). `top` (where the root really starts)
  // is the keyboard avoider's offset, so an opaque header also lays out right. A screen without a header
  // (Welcome) still clears the status bar.
  const { rootRef, onLayout, overlap } = useHeaderOverlap();
  const { scrollRef, keyboardPad, scrollProps, revealView } = useKeyboardReveal(overlap, keepVisible);
  const artFit = useArtFitState(keyboardPad > 0);
  // UX2-44: once the body scrolls, a top scroll-edge fade (paper → transparent, 56 pt below the safe area) keeps
  // content and the handwritten title from colliding with the floating glass header buttons. Only under a header.
  const [scrolled, setScrolled] = useState(false);
  const pal = usePalette();
  // UX2-59: under a header (not on a sheet), the title moves into the nav bar once it scrolls under it.
  const inline = useInlineHeaderTitle(title && (inlineTitle ?? !sheet) && overlap > 0 ? title : null, overlap);
  const paper = sheet ? pal.sheet : pal.paper;
  const ground = background ?? (sheet ? colors.sheet : undefined);
  const onScroll = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    scrollProps.onScroll(e);
    setScrolled(e.nativeEvent.contentOffset.y > 1);
    inline.onScrollY(e.nativeEvent.contentOffset.y);
  };
  useLayoutEffect(() => {
    if (!revealRef) return;
    revealRef.current = revealView;
    return () => {
      revealRef.current = null;
    };
  }, [revealRef, revealView]);
  const body = (
        <ScrollView
          ref={scrollRef}
          {...scrollProps}
          onScroll={onScroll}
          onLayout={(e) => {
            scrollProps.onLayout(e);
            artFit.onView(e.nativeEvent.layout.height);
          }}
          onContentSizeChange={(w, h) => {
            scrollProps.onContentSizeChange(w, h);
            artFit.onContent(h);
          }}
          style={styles.flex}
          refreshControl={refreshControl}
          contentContainerStyle={[styles.body, { paddingTop: Math.max(overlap, insets.top) + 8 }, floating ? styles.floatingClear : null]}
          contentInsetAdjustmentBehavior="never"
          scrollToOverflowEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {title ? (
            <Animated.View style={[styles.head, { opacity: inline.blockOpacity }]} onLayout={inline.onTitleLayout}>
              <View onLayout={inline.onTitleTextLayout}>
                <HandTitle screen underline={titleUnderline}>
                  {title}
                </HandTitle>
              </View>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </Animated.View>
          ) : null}
          {children}
          {bottom ? (
            <ArtFitContext value={artFit.context}>
              <View style={styles.spacer} onLayout={(e) => artFit.onSpacer(0, e.nativeEvent.layout.height)} />
              {bottom}
              {bottomAlign === 'center' ? (
                <View style={styles.spacer} onLayout={(e) => artFit.onSpacer(1, e.nativeEvent.layout.height)} />
              ) : null}
            </ArtFitContext>
          ) : null}
        </ScrollView>
  );
  return (
    <OnSheet value={!!sheet}>
    <View style={[styles.root, { paddingBottom: keyboardPad }, ground ? { backgroundColor: ground } : null]}>
      <View ref={rootRef} onLayout={onLayout} style={styles.flex}>
        {floating ? (
          <View style={styles.flex}>
            {body}
            {floating}
          </View>
        ) : (
          body
        )}
        {scrolled && overlap > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.edgeFade,
              // UX2-59: solid down to the header's bottom, then a 16 pt fade, so no row shows through under the bar.
              { height: overlap + 16, backgroundImage: `linear-gradient(${paper} 0%, ${paper} ${edgeSolid(overlap)}%, ${paper}00 100%)` },
            ]}
          />
        ) : null}
        {actions ? <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) + 8 }, ground ? { backgroundColor: ground } : null, actionsDivider && styles.actionsDivider]}>{actions}</View> : null}
      </View>
    </View>
    </OnSheet>
  );
}

/**
 * UX2-61: whether art in the `bottom` block can show whole (see artHidden). The slack covers the body gap before
 * the art and up to 24 pt of padding a screen puts around it, so a returning art never overflows again.
 */
function useArtFitState(keyboardUp: boolean) {
  const art = useRef(0);
  const content = useRef(0);
  const view = useRef(0);
  const spacers = useRef([0, 0]);
  const hiddenRef = useRef(false);
  const keyboardRef = useRef(keyboardUp);
  const [overflowHidden, setOverflowHidden] = useState(false);
  useLayoutEffect(() => {
    keyboardRef.current = keyboardUp;
  }, [keyboardUp]);

  const check = useCallback(() => {
    // Measures taken with the keyboard up (art gone, body shortened) say nothing about the resting layout.
    if (keyboardRef.current || art.current === 0 || view.current === 0) return;
    const next = artHidden({
      keyboardUp: false,
      shown: !hiddenRef.current,
      content: content.current,
      view: view.current,
      free: spacers.current[0] + spacers.current[1],
      art: art.current,
      slack: qSpacing.gap + 24,
    });
    if (next !== hiddenRef.current) {
      hiddenRef.current = next;
      setOverflowHidden(next);
    }
  }, []);

  const report = useCallback(
    (h: number) => {
      art.current = h;
      check();
    },
    [check],
  );
  const context = useMemo<ArtFit>(() => ({ hidden: keyboardUp || overflowHidden, report }), [keyboardUp, overflowHidden, report]);
  return {
    context,
    onView: (h: number) => {
      view.current = h;
      check();
    },
    onContent: (h: number) => {
      content.current = h;
      check();
    },
    onSpacer: (i: 0 | 1, h: number) => {
      spacers.current[i] = h;
      check();
    },
  };
}

type Measurable = { measureInWindow: ComponentRef<typeof View>['measureInWindow'] };
/** See QScreen `revealRef`. */
export type QScreenReveal = (target: Measurable, extra?: Measurable | null) => void;

/** QScreen's keyboard handling (see the QScreen comment). iOS events; Android adds did-show/hide later. */
function useKeyboardReveal(overlap: number, keepVisible?: RefObject<ComponentRef<typeof View> | null>) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const keyboardUp = useRef(false);
  const scrollY = useRef(0);
  const maxY = useRef(0);
  const sizes = useRef({ content: 0, view: 0 });
  const [keyboardPad, setKeyboardPad] = useState(0);
  const overlapRef = useRef(overlap);
  // Only the screen on top reacts: a screen below in the stack keeps its layout while another one types.
  const focused = useIsFocused();
  const focusedRef = useRef(focused);
  const keepRef = useRef(keepVisible);
  // Latest values for the keyboard callbacks, synced after commit (refs are not written during render).
  useLayoutEffect(() => {
    overlapRef.current = overlap;
    focusedRef.current = focused;
    keepRef.current = keepVisible;
  }, [overlap, focused, keepVisible]);

  // A revealView request, repeated at the next layout and content-size changes (the target may have just been
  // rendered, so the scroll range is not updated yet) for one second. A drag by the person cancels it.
  const pending = useRef<{ target: Measurable; extra: Measurable | null; until: number } | null>(null);

  const scrollIntoView = useCallback((field: Measurable, extra: Measurable | null) => {
    const scroll = scrollRef.current;
    if (!focusedRef.current || !scroll) return;
    scroll.measureInWindow((_sx, sy, _sw, sh) => {
      field.measureInWindow((_fx, fy, _fw, fh) => {
        const visible: Span = { top: sy + overlapRef.current, bottom: sy + sh };
        const fieldSpan: Span = { top: fy, bottom: fy + fh };
        if (fh === 0) return;
        const go = (extra: Span | null) => {
          const y = revealScrollY(scrollY.current, fieldSpan, visible, maxY.current, extra);
          if (y !== null) scroll.scrollTo({ y, animated: true });
        };
        if (extra) extra.measureInWindow((_kx, ky, _kw, kh) => go(kh > 0 ? { top: ky, bottom: ky + kh } : null));
        else go(null);
      });
    });
  }, []);

  const reveal = useCallback(() => {
    const field = TextInput.State.currentlyFocusedInput();
    if (keyboardUp.current && field) scrollIntoView(field, keepRef.current?.current ?? null);
    else if (pending.current && Date.now() < pending.current.until) scrollIntoView(pending.current.target, pending.current.extra);
  }, [scrollIntoView]);

  const revealView = useCallback<QScreenReveal>(
    (target, extra) => {
      pending.current = { target, extra: extra ?? null, until: Date.now() + 1000 };
      scrollIntoView(target, extra ?? null);
    },
    [scrollIntoView],
  );

  useEffect(() => {
    const move = (e: KeyboardEvent) => {
      if (!focusedRef.current) return;
      const pad = keyboardOverlap(Dimensions.get('window').height, e.endCoordinates);
      keyboardUp.current = pad > 0;
      if (e.duration) {
        LayoutAnimation.configureNext({
          duration: e.duration,
          update: { duration: e.duration, type: LayoutAnimation.Types.keyboard },
        });
      }
      setKeyboardPad(pad);
    };
    const hide = (e: KeyboardEvent) => {
      keyboardUp.current = false;
      if (e.duration) LayoutAnimation.configureNext({ duration: e.duration, update: { duration: e.duration, type: LayoutAnimation.Types.keyboard } });
      setKeyboardPad(0);
    };
    const subs = [
      Keyboard.addListener('keyboardWillChangeFrame', move),
      Keyboard.addListener('keyboardWillHide', hide),
      // Moving focus between fields with the keyboard already up sends did-show again: reveal the new field.
      Keyboard.addListener('keyboardDidShow', reveal),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [reveal]);

  const updateMax = () => {
    maxY.current = Math.max(0, sizes.current.content - sizes.current.view);
  };
  const scrollProps = {
    scrollEventThrottle: 16,
    onScrollBeginDrag: () => {
      pending.current = null;
    },
    onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
    },
    // The body shrinks once the padding lands (and a multiline field grows while typing): reveal again then.
    onLayout: (e: { nativeEvent: { layout: { height: number } } }) => {
      sizes.current.view = e.nativeEvent.layout.height;
      updateMax();
      reveal();
    },
    onContentSizeChange: (_w: number, h: number) => {
      sizes.current.content = h;
      updateMax();
      reveal();
    },
  };

  return { scrollRef, keyboardPad, scrollProps, revealView };
}

/** The small centered gray line under the pinned actions (Q 01.04 "Guest name comes next."). */
export function QCaption({ children }: { children: ReactNode }) {
  return <Text style={styles.caption}>{children}</Text>;
}

/** Section label over a group (Q 01.03 "Your rooms", Q 02.02 "Room type"); 13 pt semibold sentence case, ink2 (UX P1-12). */
export function QLabel({ children }: { children: string }) {
  return (
    <Text style={styles.label} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** UX2-59: the share of the top fade that stays solid (the header's bottom over the fade height). */
export function edgeSolid(overlap: number): number {
  return Math.round((overlap / (overlap + 16)) * 100);
}

/** UX2-48: true inside a pageSheet QScreen, so cards and fields take the sheet colors. */
const OnSheet = createContext(false);

/** UX2-48: bubbles and custom cards inside a sheet QScreen use `colors.sheetField` when this is true. */
export function useOnSheet() {
  return use(OnSheet);
}

/** Pale card (Q #F6F6F2): rows, notes and settings on Q screens. */
export function QCard({ children, row }: { children: ReactNode; row?: boolean }) {
  const onSheet = use(OnSheet);
  return <View style={[styles.card, row && styles.cardRow, onSheet && styles.cardOnSheet]}>{children}</View>;
}

/**
 * Q text field (Q 01.02, 02.01). V1: a wash fill with no border, radius 12; a 1.5 pt ink border only while focused
 * (as the join-code box). The border is always 1.5 pt (transparent when idle), so focus never shifts the text. The label shown as the placeholder and read by
 * VoiceOver as the field's name.
 * UX3-A05: `labelAbove` shows the label above the field (13 pt semibold ink2, 6 pt gap) instead of as the
 * placeholder, so it stays once you type; `placeholder` is then an example only. `helper` is a 13 pt ink2 line
 * 6 pt below (read with the field). A `secureTextEntry` field with `labelAbove` gets a 44 pt show-password eye.
 */
export function QField({
  label,
  labelAbove,
  helper,
  style,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}: ComponentProps<typeof TextInput> & { label: string; labelAbove?: boolean; helper?: string }) {
  const [shown, setShown] = useState(false);
  const [focused, setFocused] = useState(false);
  const eye = labelAbove && secureTextEntry;
  const input = (
    <TextInput
      selectionColor={colors.label}
      placeholder={labelAbove ? undefined : label}
      placeholderTextColor={colors.secondaryLabel}
      accessibilityLabel={label}
      accessibilityHint={helper}
      secureTextEntry={secureTextEntry && !shown}
      style={[styles.field, use(OnSheet) && styles.fieldOnSheet, focused && styles.fieldFocused, eye && styles.fieldWithEye, style]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      {...props}
    />
  );
  if (!labelAbove) return input;
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {label}
      </Text>
      <View>
        {input}
        {eye ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? en.fields.hidePassword : en.fields.showPassword}
            onPress={() => setShown((v) => !v)}
            style={styles.eye}
          >
            <SymbolView name={shown ? 'eye.slash' : 'eye'} size={20} tintColor={colors.ink2} />
          </Pressable>
        ) : null}
      </View>
      {helper ? (
        <Text style={styles.fieldHelper} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

/** Centered text link (Q 01.02 "New here? Create an account"). */
export function QLink({
  title,
  onPress,
  tone,
  disabled,
}: {
  title: string;
  onPress: () => void;
  /** 'danger': red text button (Q 03.03 "End room for everyone"), read as a button, not a link. */
  tone?: 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={tone === 'danger' ? 'button' : 'link'}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.link, (pressed || disabled) && { opacity: 0.5 }]}
    >
      <Text style={[styles.linkText, tone === 'danger' && { color: colors.danger }]}>{title}</Text>
    </Pressable>
  );
}

export const qSpacing = { side: 20, gap: 12 } as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  edgeFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  body: { flexGrow: 1, paddingHorizontal: qSpacing.side, paddingBottom: 24, gap: qSpacing.gap },
  // Room for a `floating` button (the Ask Qrewing footprint), so the last row scrolls clear of it.
  floatingClear: { paddingBottom: QSCREEN_FLOATING_CLEARANCE },
  head: { marginBottom: 6, gap: 4 },
  subtitle: { fontSize: 15, color: colors.ink2 },
  spacer: { flexGrow: 1 },
  caption: { fontSize: 13, color: colors.ink2, textAlign: 'center', fontVariant: ['tabular-nums'] },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink2, marginTop: 6 },
  card: { backgroundColor: colors.field, borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardOnSheet: { backgroundColor: colors.sheetField },
  fieldOnSheet: { backgroundColor: colors.sheetField },
  fieldFocused: { borderColor: colors.tint },
  fieldBlock: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  fieldHelper: { fontSize: 13, color: colors.ink2 },
  fieldWithEye: { paddingRight: 48 },
  eye: { position: 'absolute', right: 2, top: 2, bottom: 2, width: 44, alignItems: 'center', justifyContent: 'center' },
  field: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    fontSize: 17,
    color: colors.label,
    backgroundColor: colors.field,
  },
  link: { alignSelf: 'center', paddingVertical: 8 },
  linkText: { fontSize: 15, color: colors.label },
  actions: { paddingHorizontal: qSpacing.side, paddingTop: 12, gap: qSpacing.gap, backgroundColor: colors.background },
  actionsDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
});
