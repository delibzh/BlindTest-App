import { TouchableOpacity, Text, View, Image, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export interface Category {
  id: string;
  label: string;
  emoji: string;
  image?: ReturnType<typeof require>;
  color: string;
  isPremium: boolean;
}

export const CATEGORIES: Category[] = [
  { id: 'anime',        label: 'Anime',          emoji: '🎌', image: require('@/assets/Icon/categories/anime.png'),         color: Colors.categories.anime,        isPremium: false },
  { id: 'games',        label: 'Jeux Vidéo',     emoji: '🎮', image: require('@/assets/Icon/categories/games.png'),         color: Colors.categories.games,        isPremium: false },
  { id: 'series',       label: 'Séries',         emoji: '📺', image: require('@/assets/Icon/categories/series.png'),        color: Colors.categories.series,       isPremium: false },
  { id: 'movies',       label: 'Films',          emoji: '🎬', image: require('@/assets/Icon/categories/movies.png'),        color: Colors.categories.movies,       isPremium: false },
  { id: 'animation',    label: 'Animation',      emoji: '🎠', image: require('@/assets/Icon/categories/animation.png'),     color: Colors.categories.animation,    isPremium: false },
  { id: 'pubs',         label: 'Pubs',           emoji: '📢', image: require('@/assets/Icon/categories/pubs.png'),          color: Colors.categories.pubs,         isPremium: false },
  { id: 'tvshow',       label: 'TV Show',        emoji: '🎙️', image: require('@/assets/Icon/categories/tvshow.png'),        color: Colors.categories.tvshow,       isPremium: false },
  { id: 'repliques',    label: 'Répliques',      emoji: '🎭', image: require('@/assets/Icon/categories/repliques.png'),     color: Colors.categories.repliques,    isPremium: false },
  { id: 'dessinsanime', label: 'Dessins Animés', emoji: '📺', image: require('@/assets/Icon/categories/dessinsanime.png'), color: Colors.categories.dessinsanime, isPremium: false },
];

interface Props {
  category: Category;
  selected?: boolean;
  onPress: () => void;
}

export function CategoryCard({ category, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor: selected ? category.color : Colors.border },
        selected && { backgroundColor: category.color + '18' },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {category.image
        ? <Image source={category.image} style={styles.image} resizeMode="contain" />
        : <Text style={styles.emoji}>{category.emoji}</Text>
      }
      <Text style={[styles.label, selected && { color: category.color }]}>{category.label}</Text>
      {category.isPremium && (
        <View style={[styles.lock, { backgroundColor: category.color + '33' }]}>
          <Image source={require('@/assets/Icon/UI/padlock.png')} style={styles.lockIcon} resizeMode="contain" />
        </View>
      )}
      {selected && <View style={[styles.dot, { backgroundColor: category.color }]} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  emoji: { fontSize: 32 },
  image: { width: 40, height: 40 },
  label: { color: Colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  lock: { position: 'absolute', top: 8, right: 8, borderRadius: 8, padding: 3 },
  lockIcon: { width: 14, height: 14 },
  dot: { position: 'absolute', bottom: 8, width: 6, height: 6, borderRadius: 3 },
});
