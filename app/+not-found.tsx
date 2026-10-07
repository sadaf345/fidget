import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/colors';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page not found</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.replace('/')} activeOpacity={0.7}>
        <Text style={styles.buttonText}>Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600' as const, color: theme.text, marginBottom: 16 },
  button: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.accent },
  buttonText: { fontSize: 15, fontWeight: '600' as const, color: theme.bg },
});
