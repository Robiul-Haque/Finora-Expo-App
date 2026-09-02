import React, { useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  autoFocus?: boolean;
}

const SearchBarComponent: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  style,
  inputStyle,
  autoFocus = false,
}) => {
  const { theme } = useTheme();
  const searchInputRef = useRef<TextInput>(null);

  const handleClear = () => {
    onChangeText('');
    if (onClear) onClear();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => searchInputRef.current?.focus()}
      style={[
        styles.container,
        {
          backgroundColor: theme.inputBg,
          borderBottomColor: theme.border,
        },
        style,
      ]}
    >
      <Ionicons name="search" size={18} color={theme.textMuted} style={styles.searchIcon} />
      <TextInput
        ref={searchInputRef}
        style={[styles.searchInput, { color: theme.text }, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={16} color={theme.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export const SearchBar = React.memo(SearchBarComponent);

const styles = StyleSheet.create({
  container: {
    height: 44,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
});

