import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  Vibration,
  Animated,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useBarcode } from '../../hooks/useBarcode';
import { getLists, addItem } from '../../services/sqlite/shoppingService';
import { ShoppingList } from '../../types';
import { useAuthStore } from '../../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWFINDER_SIZE = 280;
const DARK = 'rgba(0,0,0,0.62)';

type RouteParams = {
  BarcodeScanner: { listId?: string };
};

export const BarcodeScannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'BarcodeScanner'>>();
  const { listId: initialListId } = route.params ?? {};
  const { user } = useAuthStore();

  const [permission, requestPermission] = useCameraPermissions();
  const { isLoading, lastResult, error, handleBarcode, reset } = useBarcode();

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | undefined>(initialListId);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [showListPicker, setShowListPicker] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualName, setManualName] = useState('');

  const scannedRef = useRef(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadLists();
      scannedRef.current = false;
    }, [user])
  );

  const loadLists = async () => {
    if (!user) return;
    const data = await getLists(user.id);
    setLists(data);
    if (!selectedListId && data.length > 0) {
      const active = data.find((l) => l.isActive);
      setSelectedListId(active?.id ?? data[0].id);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    toastOpacity.setValue(1);
    Animated.timing(toastOpacity, {
      toValue: 0,
      duration: 600,
      delay: 1500,
      useNativeDriver: true,
    }).start();
  };

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      handleBarcode(data);
    },
    [handleBarcode]
  );

  // React to error state
  useEffect(() => {
    if (error === 'not_found') {
      Alert.alert(
        'Produto não encontrado',
        'Deseja adicionar manualmente?',
        [
          {
            text: 'Não',
            style: 'cancel',
            onPress: () => {
              reset();
              scannedRef.current = false;
            },
          },
          {
            text: 'Sim',
            onPress: () => {
              reset();
              setManualName('');
              setQuantity('');
              setUnit('');
              setShowManualInput(true);
            },
          },
        ]
      );
    } else if (error && error !== 'not_found') {
      Alert.alert('Erro', error, [
        {
          text: 'OK',
          onPress: () => {
            reset();
            scannedRef.current = false;
          },
        },
      ]);
    }
  }, [error]);

  const handleAdd = async (name: string) => {
    if (!selectedListId) {
      Alert.alert('Selecione uma lista', 'Escolha uma lista de compras antes de adicionar.');
      return;
    }
    const qty = parseFloat(quantity);
    await addItem(selectedListId, name, isNaN(qty) ? undefined : qty, unit.trim() || undefined);
    Vibration.vibrate(100);
    showToast(`"${name}" adicionado!`);
    reset();
    setQuantity('');
    setUnit('');
    scannedRef.current = false;
  };

  const handleConfirm = async () => {
    if (!lastResult) return;
    await handleAdd(lastResult.name);
  };

  const handleManualAdd = async () => {
    const name = manualName.trim();
    if (!name) return;
    await handleAdd(name);
    setShowManualInput(false);
    setManualName('');
  };

  const selectedList = lists.find((l) => l.id === selectedListId);

  // ── Permission states ──────────────────────────────────────────────────────

  if (!permission) {
    return (
      <SafeAreaView style={styles.permContainer}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permContainer}>
        <Feather name="camera-off" size={48} color={theme.colors.textSecondary} />
        <Text style={styles.permTitle}>Câmera necessária</Text>
        <Text style={styles.permSubtitle}>
          Permita o acesso à câmera para escanear códigos de barras.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Permitir câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeTextBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeTextBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={onBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
      />

      {/* Overlay with viewfinder cutout */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Top dark area + close button */}
        <View style={styles.topDark} pointerEvents="box-none">
          <SafeAreaView edges={['top']} pointerEvents="box-none">
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                <Feather name="x" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Middle row: dark | viewfinder | dark */}
        <View style={styles.middleRow} pointerEvents="none">
          <View style={styles.darkSide} />
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.darkSide} />
        </View>

        {/* Bottom dark area + instruction */}
        <View style={styles.bottomDark} pointerEvents="none">
          <Text style={styles.instructionText}>
            Aponte para o código de barras do produto
          </Text>
        </View>
      </View>

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Buscando produto...</Text>
        </View>
      )}

      {/* Confirmation sheet */}
      {lastResult && (
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle} numberOfLines={2}>{lastResult.name}</Text>
          {lastResult.brand ? (
            <Text style={styles.sheetBrand}>{lastResult.brand}</Text>
          ) : null}

          <View style={styles.sheetRow}>
            <View style={styles.sheetField}>
              <Text style={styles.sheetLabel}>Quantidade</Text>
              <TextInput
                style={styles.sheetInput}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="—"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            <View style={styles.sheetField}>
              <Text style={styles.sheetLabel}>Unidade</Text>
              <TextInput
                style={styles.sheetInput}
                value={unit}
                onChangeText={setUnit}
                placeholder="—"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.listSelector}
            onPress={() => setShowListPicker(true)}
          >
            <Feather name="shopping-cart" size={16} color={theme.colors.primary} />
            <Text style={styles.listSelectorText} numberOfLines={1}>
              {selectedList ? selectedList.name : 'Selecionar lista...'}
            </Text>
            <Feather name="chevron-down" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.sheetButtons}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                reset();
                setQuantity('');
                setUnit('');
                scannedRef.current = false;
              }}
            >
              <Text style={styles.secondaryBtnText}>Escanear outro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, !selectedListId && styles.primaryBtnDisabled]}
              onPress={handleConfirm}
              disabled={!selectedListId}
            >
              <Text style={styles.primaryBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Toast */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Feather name="check-circle" size={16} color="#fff" />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      {/* List picker Modal */}
      <Modal
        visible={showListPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowListPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowListPicker(false)}
        >
          <View style={styles.listPickerSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.listPickerTitle}>Selecionar lista</Text>
            {lists.length === 0 ? (
              <Text style={styles.noListsText}>
                Nenhuma lista criada. Crie uma na aba Compras.
              </Text>
            ) : (
              <FlatList
                data={lists}
                keyExtractor={(l) => l.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.listPickerItem,
                      item.id === selectedListId && styles.listPickerItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedListId(item.id);
                      setShowListPicker(false);
                    }}
                  >
                    <Text style={styles.listPickerItemText}>{item.name}</Text>
                    {item.id === selectedListId && (
                      <Feather name="check" size={18} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Manual input Modal */}
      <Modal
        visible={showManualInput}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowManualInput(false);
          scannedRef.current = false;
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowManualInput(false);
            scannedRef.current = false;
          }}
        >
          <TouchableOpacity style={styles.manualBox} activeOpacity={1}>
            <Text style={styles.manualTitle}>Adicionar manualmente</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="Nome do produto"
              value={manualName}
              onChangeText={setManualName}
              autoFocus
              placeholderTextColor={theme.colors.textSecondary}
              returnKeyType="done"
            />
            <View style={styles.sheetRow}>
              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Quantidade</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="—"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Unidade</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="—"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
            </View>
            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setShowManualInput(false);
                  setManualName('');
                  setQuantity('');
                  setUnit('');
                  scannedRef.current = false;
                }}
              >
                <Text style={styles.secondaryBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, !manualName.trim() && styles.primaryBtnDisabled]}
                onPress={handleManualAdd}
                disabled={!manualName.trim()}
              >
                <Text style={styles.primaryBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const SIDE_WIDTH = (SCREEN_WIDTH - VIEWFINDER_SIZE) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Overlay ──
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topDark: {
    backgroundColor: DARK,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleRow: {
    flexDirection: 'row',
    height: VIEWFINDER_SIZE,
  },
  darkSide: {
    width: SIDE_WIDTH,
    backgroundColor: DARK,
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#fff',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  bottomDark: {
    flex: 1,
    backgroundColor: DARK,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 32,
  },
  instructionText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Loading ──
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },

  // ── Confirmation sheet ──
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sheetBrand: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: -8,
  },
  sheetRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sheetField: {
    flex: 1,
    gap: 4,
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sheetInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  listSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  listSelectorText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Toast ──
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  listPickerSheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '60%',
  },
  listPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 4,
  },
  noListsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: 24,
  },
  listPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  listPickerItemSelected: {
    backgroundColor: theme.colors.primary + '10',
  },
  listPickerItemText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
  },
  manualBox: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    gap: 12,
  },
  manualTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  manualInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  // ── Permission screen ──
  permContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  permSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  permBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 24,
    paddingVertical: 13,
    marginTop: 8,
  },
  permBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  closeTextBtn: {
    paddingVertical: 10,
  },
  closeTextBtnText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
