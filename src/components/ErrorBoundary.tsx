import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Gracefully catch rendering errors without throwing unhandled exceptions
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0D0A14" />
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning-outline" size={48} color="#E2136E" />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              An unexpected issue occurred. Your data is safe and stored locally.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" style={styles.retryIcon} />
              <Text style={styles.retryText}>Reload App</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0A14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 28,
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(226, 19, 110, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2136E',
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowColor: '#E2136E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
