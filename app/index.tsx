import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  Dimensions,
  StyleSheet,
  Platform,
  TextInput,
  SafeAreaView,
  PanResponder,
  KeyboardEvent,
  Alert,
} from 'react-native';
import { RotateCcw, ArrowRight, Globe, Mic, X } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Accelerometer, Gyroscope } from 'expo-sensors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Japanese keyboard layout data
const keyboardLayout = [
  [
    { main: 'あ', flicks: ['あ', 'い', 'う', 'え', 'お'] },
    { main: 'か', flicks: ['か', 'き', 'く', 'け', 'こ'] },
    { main: 'さ', flicks: ['さ', 'し', 'す', 'せ', 'そ'] },
  ],
  [
    { main: 'た', flicks: ['た', 'ち', 'つ', 'て', 'と'] },
    { main: 'な', flicks: ['な', 'に', 'ぬ', 'ね', 'の'] },
    { main: 'は', flicks: ['は', 'ひ', 'ふ', 'へ', 'ほ'] },
  ],
  [
    { main: 'ま', flicks: ['ま', 'み', 'む', 'め', 'も'] },
    { main: 'や', flicks: ['や', '', 'ゆ', '', 'よ'] },
    { main: 'ら', flicks: ['ら', 'り', 'る', 'れ', 'ろ'] },
  ],
  [
    { main: 'ん', flicks: ['ん'] },
    { main: 'わ', flicks: ['わ', 'を', '', '', ''] },
    { main: '、。?!', flicks: ['、', '。', '?', '!', '…'] },
  ],
];

interface FlickKeyProps {
  keyData: { main: string; flicks: string[] };
  onCharacterInput: (char: string) => void;
  tiltScale: number;
  position: 'left' | 'center' | 'right';
}

const FlickKey: React.FC<FlickKeyProps> = ({ keyData, onCharacterInput, tiltScale, position }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [currentFlick, setCurrentFlick] = useState(0);
  const [showFlicks, setShowFlicks] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animated values for smooth scaling
  const scale = useSharedValue(1);
  const fontSize = useSharedValue(18);

  // Animation configuration
  const animationConfig = {
    duration: 300,
    easing: Easing.out(Easing.cubic),
  };

  const resetAnimationConfig = {
    duration: 400,
    easing: Easing.inOut(Easing.cubic),
  };

  useEffect(() => {
    const threshold = 0.15; // しきい値を調整
    const maxScale = 1.8; // 高齢者向けにより大きく拡大
    const maxFontSize = 32; // フォントサイズも大幅に拡大

    // 既存のタイマーをクリア
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    if (position === 'left' && tiltScale < -threshold) {
      // 左に傾いた時、左側のボタンを拡大
      scale.value = withTiming(maxScale, animationConfig);
      fontSize.value = withTiming(maxFontSize, animationConfig);
      
      // 2秒後に元に戻す
      animationTimeoutRef.current = setTimeout(() => {
        scale.value = withTiming(1, resetAnimationConfig);
        fontSize.value = withTiming(18, resetAnimationConfig);
      }, 2000);
    } else if (position === 'right' && tiltScale > threshold) {
      // 右に傾いた時、右側のボタンを拡大
      scale.value = withTiming(maxScale, animationConfig);
      fontSize.value = withTiming(maxFontSize, animationConfig);
      
      // 2秒後に元に戻す
      animationTimeoutRef.current = setTimeout(() => {
        scale.value = withTiming(1, resetAnimationConfig);
        fontSize.value = withTiming(18, resetAnimationConfig);
      }, 2000);
    } else if (Math.abs(tiltScale) <= threshold) {
      // しきい値以下の場合は即座に元に戻す
      scale.value = withTiming(1, resetAnimationConfig);
      fontSize.value = withTiming(18, resetAnimationConfig);
    }

    // クリーンアップ関数
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [tiltScale, position]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      fontSize: fontSize.value,
    };
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    onPanResponderGrant: (evt) => {
      setIsPressed(true);
      setShowFlicks(true);
      panStartRef.current = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
    },
    
    onPanResponderMove: (evt) => {
      const deltaX = evt.nativeEvent.locationX - panStartRef.current.x;
      const deltaY = evt.nativeEvent.locationY - panStartRef.current.y;
      const threshold = 20;
      
      let flickIndex = 0;
      
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        if (deltaY < -threshold) flickIndex = 1; // Up
        else if (deltaY > threshold) flickIndex = 3; // Down
      } else {
        if (deltaX < -threshold) flickIndex = 4; // Left
        else if (deltaX > threshold) flickIndex = 2; // Right
      }
      
      setCurrentFlick(flickIndex);
    },
    
    onPanResponderRelease: () => {
      const selectedChar = keyData.flicks[currentFlick];
      if (selectedChar && selectedChar.trim()) {
        onCharacterInput(selectedChar);
      }
      
      setIsPressed(false);
      setShowFlicks(false);
      setCurrentFlick(0);
    },
  });

  return (
    <View style={styles.keyContainer}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.key,
          isPressed && styles.keyPressed,
          animatedStyle
        ]}
      >
        <Animated.Text style={[styles.keyText, animatedTextStyle]}>
          {keyData.main}
        </Animated.Text>
        
        {showFlicks && (
          <View style={styles.flickOverlay}>
            {keyData.flicks.map((char, index) => (
              <View
                key={index}
                style={[
                  styles.flickChar,
                  styles[`flickPos${index}` as keyof typeof styles] as any,
                  currentFlick === index && styles.flickCharActive
                ]}
              >
                <Text style={[
                  styles.flickText,
                  currentFlick === index && styles.flickTextActive
                ]}>
                  {char}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

interface SpecialKeyProps {
  icon?: React.ReactNode;
  text?: string;
  onPress: () => void;
  style?: any;
}

const SpecialKey: React.FC<SpecialKeyProps> = ({ icon, text, onPress, style }) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <TouchableWithoutFeedback
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={onPress}
    >
      <View style={[styles.specialKey, style, isPressed && styles.keyPressed]}>
        {icon || <Text style={styles.specialKeyText}>{text}</Text>}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default function JapaneseKeyboard() {
  const [inputText, setInputText] = useState('');
  const [tiltScale, setTiltScale] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [sensorSupported, setSensorSupported] = useState(false);
  const [showDebug, setShowDebug] = useState(true);
  const [accelerationData, setAccelerationData] = useState({
    x: 0,
    y: 0,
    z: 0,
    timestamp: 0
  });
  const [rotationData, setRotationData] = useState({
    alpha: 0,
    beta: 0,
    gamma: 0
  });
  const motionListenerRef = useRef<((event: DeviceMotionEvent) => void) | null>(null);
  const orientationListenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  const textInputRef = useRef<TextInput>(null);

  // Bluetooth keyboard support
  useEffect(() => {
    const handleKeyPress = (key: string) => {
      // Handle special keys
      if (key === 'Backspace') {
        handleBackspace();
        return;
      }
      
      if (key === 'Enter') {
        handleNewLine();
        return;
      }
      
      if (key === ' ') {
        handleSpace();
        return;
      }
      
      // Handle regular character input
      if (key.length === 1) {
        handleCharacterInput(key);
      }
    };

    // Add keyboard event listener for web
    if (Platform.OS === 'web') {
      const handleWebKeyPress = (event: any) => {
        // Prevent default behavior for special keys
        if (['Backspace', 'Enter', ' '].includes(event.key)) {
          event.preventDefault();
        }
        
        handleKeyPress(event.key);
      };

      document.addEventListener('keydown', handleWebKeyPress);
      
      return () => {
        document.removeEventListener('keydown', handleWebKeyPress);
      };
    }
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const initializeSensor = async () => {
      try {
        if (Platform.OS === 'web') {
          // Web環境での処理
          await initializeWebSensors();
        } else {
          // React Native環境での処理（expo-sensorsを使用）
          await initializeNativeSensors();
        }
      } catch (error) {
        console.warn('Sensor initialization failed:', error);
        setSensorSupported(false);
      }
    };

    const initializeWebSensors = async () => {
      // Check if DeviceMotionEvent is supported
      if (typeof DeviceMotionEvent === 'undefined') {
        setSensorSupported(false);
        return;
      }

      setSensorSupported(true);

      // Check if permission is required (iOS 13+)
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceMotionEvent as any).requestPermission();
          if (permission === 'granted') {
            setPermissionGranted(true);
            startWebListening();
          } else {
            setPermissionGranted(false);
            // アラートでユーザーに許可を促す
            Alert.alert(
              'センサー権限が必要です',
              'キーボードの傾き機能を使用するには、デバイスモーションセンサーの許可が必要です。',
              [
                { text: 'キャンセル', style: 'cancel' },
                { text: '許可', onPress: handleRequestPermission }
              ]
            );
          }
        } catch (error) {
          console.warn('Permission request failed:', error);
          setPermissionGranted(false);
          Alert.alert(
            'センサー権限エラー',
            'センサーの許可を取得できませんでした。設定から手動で許可してください。',
            [{ text: 'OK' }]
          );
        }
      } else {
        // For other browsers, assume permission is granted
        setPermissionGranted(true);
        startWebListening();
      }
    };

    const initializeNativeSensors = async () => {
      // expo-sensorsの可用性をチェック
      const isAvailable = await Accelerometer.isAvailableAsync();
      if (isAvailable) {
        setSensorSupported(true);
        setPermissionGranted(true);
        startNativeListening();
      } else {
        setSensorSupported(false);
        Alert.alert(
          'センサー非対応',
          'このデバイスはモーションセンサーに対応していません。',
          [{ text: 'OK' }]
        );
      }
    };

    const startWebListening = () => {
      const handleDeviceMotion = (event: DeviceMotionEvent) => {
        try {
          if (event.accelerationIncludingGravity) {
            const { x, y, z } = event.accelerationIncludingGravity;
            
            // Update acceleration data for debug display
            setAccelerationData({
              x: x || 0,
              y: y || 0,
              z: z || 0,
              timestamp: Date.now()
            });

            if (x !== null && x !== undefined) {
              // Normalize tilt value between -1 and 1
              const normalizedTilt = Math.max(-1, Math.min(1, x / 5));
              setTiltScale(normalizedTilt);
            }
          }
        } catch (error) {
          console.warn('Motion event handling error:', error);
        }
      };

      const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
        try {
          setRotationData({
            alpha: event.alpha || 0,
            beta: event.beta || 0,
            gamma: event.gamma || 0
          });
        } catch (error) {
          console.warn('Orientation event handling error:', error);
        }
      };

      motionListenerRef.current = handleDeviceMotion;
      orientationListenerRef.current = handleDeviceOrientation;
      
      window.addEventListener('devicemotion', handleDeviceMotion, { passive: true });
      window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });
      
      cleanup = () => {
        if (motionListenerRef.current) {
          window.removeEventListener('devicemotion', motionListenerRef.current);
          motionListenerRef.current = null;
        }
        if (orientationListenerRef.current) {
          window.removeEventListener('deviceorientation', orientationListenerRef.current);
          orientationListenerRef.current = null;
        }
      };
    };

    const startNativeListening = () => {
      // Accelerometerの更新頻度を設定
      Accelerometer.setUpdateInterval(100); // 100ms間隔

      const subscription = Accelerometer.addListener(({ x, y, z }) => {
        setAccelerationData({
          x: x || 0,
          y: y || 0,
          z: z || 0,
          timestamp: Date.now()
        });

        // Normalize tilt value between -1 and 1
        const normalizedTilt = Math.max(-1, Math.min(1, x / 1));
        setTiltScale(normalizedTilt);
      });

      cleanup = () => {
        subscription && subscription.remove();
      };
    };

    initializeSensor();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const handleRequestPermission = async () => {
    if (Platform.OS === 'web' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setPermissionGranted(true);
          // Reload to reinitialize
          window.location.reload();
        } else {
          Alert.alert(
            'センサー権限が拒否されました',
            'キーボードの傾き機能を使用するには、ブラウザの設定でモーションセンサーの許可を有効にしてください。',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Permission request failed:', error);
        Alert.alert(
          'エラー',
          'センサー権限の要求中にエラーが発生しました。ブラウザを再読み込みして再試行してください。',
          [{ text: 'OK' }]
        );
      }
    } else if (Platform.OS !== 'web') {
      // React Native環境での権限要求
      try {
        const isAvailable = await Accelerometer.isAvailableAsync();
        if (isAvailable) {
          setPermissionGranted(true);
          setSensorSupported(true);
          // センサーリスナーを開始
          window.location.reload();
        } else {
          Alert.alert(
            'センサー非対応',
            'このデバイスはモーションセンサーに対応していません。',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Native sensor check failed:', error);
        Alert.alert(
          'エラー',
          'センサーの確認中にエラーが発生しました。',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleCharacterInput = (char: string) => {
    setInputText(prev => prev + char);
    // Keep focus on the TextInput to maintain cursor position
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  const handleBackspace = () => {
    setInputText(prev => prev.slice(0, -1));
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  const handleSpace = () => {
    setInputText(prev => prev + ' ');
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  const handleNewLine = () => {
    setInputText(prev => prev + '\n');
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  const handleTextInputFocus = () => {
    // Immediately blur to prevent default keyboard
    if (textInputRef.current) {
      textInputRef.current.blur();
    }
  };

  const toggleDebugDisplay = () => {
    setShowDebug(!showDebug);
  };

  // Component for sensor permission request
  const SensorPermissionModal = () => {
    if (sensorSupported && !permissionGranted) {
      return (
        <View style={styles.permissionModal}>
          <View style={styles.permissionModalContent}>
            <Text style={styles.permissionModalTitle}>センサー権限が必要です</Text>
            <Text style={styles.permissionModalText}>
              キーボードの傾き機能を使用するには、デバイスのモーションセンサーへのアクセス許可が必要です。
            </Text>
            {Platform.OS === 'web' && (
              <Text style={styles.permissionModalSubtext}>
                iOS: 設定 → Safari → モーションと方向のアクセス を有効にしてください
              </Text>
            )}
            <View style={styles.permissionModalButtons}>
              <TouchableWithoutFeedback onPress={() => setPermissionGranted(false)}>
                <View style={styles.permissionModalSkipButton}>
                  <Text style={styles.permissionModalSkipText}>スキップ</Text>
                </View>
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback onPress={handleRequestPermission}>
                <View style={styles.permissionModalAllowButton}>
                  <Text style={styles.permissionModalAllowText}>許可する</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <SensorPermissionModal />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableWithoutFeedback>
          <Text style={styles.headerButton}>戻る</Text>
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={toggleDebugDisplay}>
          <Text style={styles.headerButton}>Debug</Text>
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback>
          <Text style={styles.headerButton}>完了</Text>
        </TouchableWithoutFeedback>
      </View>

      {/* Text Area */}
      <View style={styles.textArea}>
        <TextInput
          ref={textInputRef}
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          multiline
          placeholder="テキストを入力してください... (Bluetoothキーボード対応)"
          placeholderTextColor="#999"
          showSoftInputOnFocus={false}
          onFocus={handleTextInputFocus}
          caretHidden={false}
          editable={true}
          autoFocus={false}
          keyboardType="default"
          inputAccessoryViewID="customKeyboard"
        />
        
        {/* Enhanced Debug info */}
        {Platform.OS === 'web' && showDebug && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugTitle}>センサーデバッグ情報</Text>
            
            <Text style={styles.debugText}>
              サポート: {sensorSupported ? '✓' : '✗'} | 権限: {permissionGranted ? '✓' : '✗'}
            </Text>
            
            {!sensorSupported && (
              <Text style={styles.errorText}>
                ⚠️ このデバイス/ブラウザはモーションセンサーに対応していません
              </Text>
            )}
            
            {sensorSupported && !permissionGranted && (
              <View style={styles.permissionSection}>
                <Text style={styles.warningText}>
                  ⚠️ センサー権限が必要です
                </Text>
                <TouchableWithoutFeedback onPress={handleRequestPermission}>
                  <View style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>センサー権限を許可</Text>
                  </View>
                </TouchableWithoutFeedback>
                <Text style={styles.instructionText}>
                  iOSの場合: 設定 → Safari → モーションと方向のアクセス を有効にしてください
                </Text>
              </View>
            )}
            
            <Text style={styles.debugSectionTitle}>Bluetoothキーボード</Text>
            <Text style={styles.debugText}>対応済み ✓</Text>
            
            {sensorSupported && permissionGranted && (
              <>
                <Text style={styles.debugSectionTitle}>加速度 (m/s²)</Text>
                <Text style={styles.debugText}>
                  X: {accelerationData.x.toFixed(3)}
                </Text>
                <Text style={styles.debugText}>
                  Y: {accelerationData.y.toFixed(3)}
                </Text>
                <Text style={styles.debugText}>
                  Z: {accelerationData.z.toFixed(3)}
                </Text>
                
                <Text style={styles.debugSectionTitle}>傾き効果 (改良版)</Text>
                <Text style={styles.debugText}>
                  正規化値: {tiltScale.toFixed(3)}
                </Text>
                <Text style={styles.debugText}>
                  しきい値: ±0.15
                </Text>
                <Text style={styles.debugText}>
                  最大拡大率: 1.8倍
                </Text>
                <Text style={styles.debugText}>
                  アニメーション: 0.3秒拡大 → 2秒後復帰
                </Text>
                <Text style={styles.debugText}>
                  スケール効果: {Math.abs(tiltScale) > 0.15 ? (tiltScale < 0 ? '左拡大中 (Left)' : '右拡大中 (Right)') : 'なし'}
                </Text>
                <Text style={styles.debugText}>
                  現在の傾き: {tiltScale > 0 ? '右' : '左'} ({Math.abs(tiltScale).toFixed(3)})
                </Text>
                
                <Text style={styles.debugSectionTitle}>回転 (度)</Text>
                <Text style={styles.debugText}>
                  α: {rotationData.alpha.toFixed(1)}°
                </Text>
                <Text style={styles.debugText}>
                  β: {rotationData.beta.toFixed(1)}°
                </Text>
                <Text style={styles.debugText}>
                  γ: {rotationData.gamma.toFixed(1)}°
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <SpecialKey
          text="Aa"
          onPress={() => {}}
          style={styles.toolbarButton}
        />
        <SpecialKey
          icon={<View style={styles.formatIcon} />}
          onPress={() => {}}
          style={styles.toolbarButton}
        />
        <SpecialKey
          icon={<View style={styles.tableIcon} />}
          onPress={() => {}}
          style={styles.toolbarButton}
        />
        <SpecialKey
          icon={<View style={styles.attachIcon} />}
          onPress={() => {}}
          style={styles.toolbarButton}
        />
        <SpecialKey
          icon={<View style={styles.compassIcon} />}
          onPress={() => {}}
          style={styles.toolbarButton}
        />
        <TouchableWithoutFeedback>
          <View style={styles.closeButton}>
            <X size={18} color="#666" />
          </View>
        </TouchableWithoutFeedback>
      </View>

      {/* Keyboard */}
      <View style={styles.keyboard}>
        {/* Main keyboard area with character keys and side buttons */}
        <View style={styles.mainKeyboardArea}>
          {/* Left side buttons */}
          <View style={styles.leftSideButtons}>
            <SpecialKey
              icon={<ArrowRight size={16} color="#000" />}
              onPress={handleBackspace}
              style={styles.sideKey}
            />
            <SpecialKey
              icon={<RotateCcw size={16} color="#000" />}
              onPress={() => {}}
              style={styles.sideKey}
            />
            <SpecialKey
              text="ABC"
              onPress={() => {}}
              style={styles.sideKey}
            />
            <SpecialKey
              text="😊"
              onPress={() => {}}
              style={[styles.sideKey, styles.emojiKey]}
            />
          </View>

          {/* Character Keys */}
          <View style={styles.characterKeys}>
            {keyboardLayout.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keyRow}>
                {row.map((keyData, keyIndex) => (
                  <FlickKey
                    key={keyIndex}
                    keyData={keyData}
                    onCharacterInput={handleCharacterInput}
                    tiltScale={tiltScale}
                    position={keyIndex === 0 ? 'left' : keyIndex === 2 ? 'right' : 'center'}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Right side buttons */}
          <View style={styles.rightSideButtons}>
            <SpecialKey
              icon={<X size={16} color="#000" />}
              onPress={() => setInputText('')}
              style={styles.sideKey}
            />
            <SpecialKey
              text="空白"
              onPress={handleSpace}
              style={styles.sideKey}
            />
            <SpecialKey
              text="改行"
              onPress={handleNewLine}
              style={[styles.sideKey, styles.returnKey]}
            />
          </View>
        </View>

        {/* Bottom Row */}
        <View style={styles.bottomRow}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.bottomLeftKey}>
              <Globe size={20} color="#000" />
            </View>
          </TouchableWithoutFeedback>
          
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.bottomRightKey}>
              <Mic size={20} color="#000" />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </View>

      {/* Sensor Permission Modal */}
      <SensorPermissionModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  textArea: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
    color: '#000',
    textAlignVertical: 'top',
  },
  debugInfo: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 12,
    borderRadius: 8,
    maxWidth: 300,
    minWidth: 220,
  },
  debugTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  debugSectionTitle: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  debugText: {
    color: '#fff',
    fontSize: 11,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  permissionSection: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 4,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 11,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  warningText: {
    color: '#ff9800',
    fontSize: 11,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  instructionText: {
    color: '#ccc',
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
  permissionModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  permissionModalContent: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    maxWidth: 300,
  },
  permissionModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionModalText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionModalSubtext: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  permissionModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  permissionModalSkipButton: {
    backgroundColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  permissionModalSkipText: {
    color: '#333',
    fontWeight: '500',
  },
  permissionModalAllowButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  permissionModalAllowText: {
    color: 'white',
    fontWeight: 'bold',
  },
  toolbar: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  toolbarButton: {
    width: 32,
    height: 32,
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  formatIcon: {
    width: 16,
    height: 12,
    backgroundColor: '#666',
    borderRadius: 2,
  },
  tableIcon: {
    width: 16,
    height: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
  },
  attachIcon: {
    width: 16,
    height: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    transform: [{ rotate: '45deg' }],
  },
  compassIcon: {
    width: 16,
    height: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 8,
  },
  closeButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  keyboard: {
    backgroundColor: '#d1d3d9',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 8,
    paddingHorizontal: 4,
  },
  mainKeyboardArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftSideButtons: {
    width: 50,
    marginRight: 4,
  },
  rightSideButtons: {
    width: 50,
    marginLeft: 4,
  },
  sideKey: {
    width: 46,
    height: 46,
    marginBottom: 6,
    backgroundColor: '#a8aaaf',
  },
  emojiKey: {
    fontSize: 20,
  },
  returnKey: {
    height: 98, // 改行ボタンを縦長に（2つ分の高さ + マージン）
  },
  characterKeys: {
    flex: 1,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  keyContainer: {
    flex: 1,
    marginHorizontal: 2,
  },
  key: {
    backgroundColor: 'white',
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
    position: 'relative',
  },
  keyPressed: {
    backgroundColor: '#e8e8e8',
    shadowOpacity: 0.1,
  },
  keyText: {
    fontSize: 18,
    color: '#000',
    fontWeight: '400',
  },
  flickOverlay: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 120,
    height: 120,
    zIndex: 1000,
  },
  flickChar: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flickPos0: { left: 40, top: 40 }, // Center
  flickPos1: { left: 40, top: 0 },  // Up
  flickPos2: { left: 80, top: 40 }, // Right
  flickPos3: { left: 40, top: 80 }, // Down
  flickPos4: { left: 0, top: 40 },  // Left
  flickCharActive: {
    backgroundColor: '#007AFF',
  },
  flickText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  flickTextActive: {
    color: 'white',
  },
  specialKey: {
    backgroundColor: '#a8aaaf',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  specialKeyText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  bottomLeftKey: {
    width: 46,
    height: 46,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRightKey: {
    width: 46,
    height: 46,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
});