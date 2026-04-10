import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Text, View } from 'react-native';

interface Props {
  recording: boolean;
  onPress: () => void;
}

export default function MicButton({ recording, onPress }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (recording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [recording]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.ripple, recording && styles.rippleActive, { transform: [{ scale: pulse }] }]} />
      <TouchableOpacity
        onPress={onPress}
        style={[styles.btn, recording && styles.btnRecording]}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>🎙</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: 80, height: 80 },
  ripple: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 1, borderColor: 'rgba(0,200,255,0.3)',
  },
  rippleActive: { borderColor: 'rgba(255,77,109,0.5)' },
  btn: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2, borderColor: '#00c8ff',
    backgroundColor: 'rgba(0,200,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnRecording: {
    borderColor: '#ff4d6d',
    backgroundColor: 'rgba(255,77,109,0.1)',
  },
  icon: { fontSize: 26 },
});
