import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface CustomCalendarModalProps {
  visible: boolean;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

const CustomCalendarModalComponent: React.FC<CustomCalendarModalProps> = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  const { theme, isDarkMode } = useTheme();
  const [pickerViewMonth, setPickerViewMonth] = useState<Date>(selectedDate || new Date());

  const isClosing = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      const initDate = selectedDate ? new Date(selectedDate) : new Date();
      setPickerViewMonth(isNaN(initDate.getTime()) ? new Date() : initDate);
      isClosing.current = false;
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          mass: 0.8,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const daysInMonth = useMemo(() => {
    const year = pickerViewMonth.getFullYear();
    const month = pickerViewMonth.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [pickerViewMonth]);

  const firstDayOfWeek = useMemo(() => {
    const year = pickerViewMonth.getFullYear();
    const month = pickerViewMonth.getMonth();
    return new Date(year, month, 1).getDay();
  }, [pickerViewMonth]);

  const handlePrevMonth = () => {
    setPickerViewMonth(
      new Date(pickerViewMonth.getFullYear(), pickerViewMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setPickerViewMonth(
      new Date(pickerViewMonth.getFullYear(), pickerViewMonth.getMonth() + 1, 1)
    );
  };

  const handleDaySelect = (dayNum: number) => {
    const newDate = new Date(
      pickerViewMonth.getFullYear(),
      pickerViewMonth.getMonth(),
      dayNum,
      12,
      0,
      0
    );
    onSelectDate(newDate);
    handleClose();
  };

  const monthName = pickerViewMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.calendarCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header Navigation */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={[styles.navBtn, { backgroundColor: theme.cardSecondary }]}
            >
              <Ionicons name="chevron-back" size={18} color={theme.text} />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: theme.text }]}>{monthName}</Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.navBtn, { backgroundColor: theme.cardSecondary }]}
            >
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Quick Shortcuts */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={[
                styles.quickBtn,
                { backgroundColor: theme.cardSecondary, borderColor: theme.border },
              ]}
              onPress={() => {
                onSelectDate(new Date());
                onClose();
              }}
            >
              <Text style={[styles.quickBtnText, { color: theme.primary }]}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickBtn,
                { backgroundColor: theme.cardSecondary, borderColor: theme.border },
              ]}
              onPress={() => {
                onSelectDate(new Date(Date.now() - 86400000));
                onClose();
              }}
            >
              <Text style={[styles.quickBtnText, { color: theme.textSecondary }]}>Yesterday</Text>
            </TouchableOpacity>
          </View>

          {/* Day Names Row */}
          <View style={styles.weekDaysRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <Text key={idx} style={[styles.weekDayText, { color: theme.textMuted }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.dayCell} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === dayNum &&
                selectedDate.getMonth() === pickerViewMonth.getMonth() &&
                selectedDate.getFullYear() === pickerViewMonth.getFullYear();

              return (
                <TouchableOpacity
                  key={`day-${dayNum}`}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: theme.primary, borderRadius: 20 },
                  ]}
                  onPress={() => handleDaySelect(dayNum)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#FFFFFF' : theme.text },
                      isSelected && styles.selectedDayText,
                    ]}
                  >
                    {dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]}
            onPress={handleClose}
          >
            <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export const CustomCalendarModal = React.memo(CustomCalendarModalComponent);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedDayText: {
    fontWeight: '800',
  },
  closeBtn: {
    marginTop: 14,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
