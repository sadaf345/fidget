import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, FolderOpen, Gamepad2, Zap, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/colors';

const { width: SCREEN_W } = Dimensions.get('window');

function FloatingOrbs() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.orb,
          {
            width: 340,
            height: 340,
            top: -100,
            right: -80,
            backgroundColor: '#4ECDC4',
            opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.15] }),
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] }) }],
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: 260,
            height: 260,
            bottom: 40,
            left: -70,
            backgroundColor: '#6366F1',
            opacity: 0.08,
          },
        ]}
      />
      <View
        style={[
          styles.orb,
          {
            width: 200,
            height: 200,
            top: '40%',
            right: -40,
            backgroundColor: '#F87171',
            opacity: 0.06,
          },
        ]}
      />
    </View>
  );
}

interface MenuCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  onPress: () => void;
  delay: number;
}

function MenuCard({ title, subtitle, icon, accentColor, onPress, delay }: MenuCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, delay]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, friction: 8 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        style={styles.menuCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[styles.menuIconWrap, { backgroundColor: accentColor + '15' }]}>
          {icon}
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
        <ChevronRight size={20} color={theme.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LandingPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(logoSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [logoFade, logoSlide]);

  const handleNavigate = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push(route as any);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <FloatingOrbs />

      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
        <Animated.View
          style={[
            styles.heroSection,
            { opacity: logoFade, transform: [{ translateY: logoSlide }] },
          ]}
        >
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>fidget</Text>
            <View style={styles.logoDot} />
          </View>
          <Text style={styles.tagline}>Build your perfect haptic playground</Text>
        </Animated.View>

        <View style={styles.menuSection}>
          <MenuCard
            title="Create Fidget"
            subtitle="Design a new widget board, name it, and save it"
            icon={<Plus size={24} color={theme.accent} />}
            accentColor={theme.accent}
            onPress={() => handleNavigate('/create')}
            delay={150}
          />
          <MenuCard
            title="My Widgets"
            subtitle="Browse and revisit your saved fidget boards"
            icon={<FolderOpen size={24} color="#F7B267" />}
            accentColor="#F7B267"
            onPress={() => handleNavigate('/my-widgets')}
            delay={250}
          />
          <MenuCard
            title="Enter Playground"
            subtitle="Free-range sandbox to experiment with widgets"
            icon={<Gamepad2 size={24} color="#A78BFA" />}
            accentColor="#A78BFA"
            onPress={() => handleNavigate('/playground')}
            delay={350}
          />
          <MenuCard
            title="Haptics Lab"
            subtitle="Explore all iOS haptic feedback patterns"
            icon={<Zap size={24} color="#F87171" />}
            accentColor="#F87171"
            onPress={() => handleNavigate('/haptics')}
            delay={450}
          />
        </View>

        <Animated.View style={[styles.footer, { opacity: logoFade }]}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>Fidget</Text>
          <View style={styles.footerLine} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 42,
    fontWeight: '800' as const,
    color: theme.text,
    letterSpacing: -2,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.accent,
    marginTop: 18,
  },
  tagline: {
    fontSize: 16,
    color: theme.textSecondary,
    letterSpacing: -0.3,
  },
  menuSection: {
    gap: 14,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 14,
  },
  menuIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: theme.text,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  menuSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  footerLine: {
    height: 1,
    width: 40,
    backgroundColor: theme.border,
  },
  footerText: {
    fontSize: 12,
    color: theme.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
});
