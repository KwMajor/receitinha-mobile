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
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
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
import { useTheme } from '../../contexts/ThemeContext';
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
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [permission, requestPermission] = useCameraPermissions();
  const { isLoading, lastResult, error, handleBarcode, reset } = useBarcode();

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | undefined>(initialListId);
  const [quantity, setQuantity] = useState('');
  const [showListPicker, setShowListPicker] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualName, setManualName] = useState('');

  const [cameraActive, setCameraActive] = useState(true);
  const scannedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      loadLists();
      scannedRef.current = false;
      setCameraActive(true);
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

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      setCameraActive(false);
      handleBarcode(data);
    },
    [handleBarcode]
  );

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
              setCameraActive(true);
            },
          },
          {
            text: 'Sim',
            onPress: () => {
              reset();
              setManualName('');
              setQuantity('');
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
            setCameraActive(true);
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
    await addItem(selectedListId, name, isNaN(qty) ? undefined : qty);
    Vibration.vibrate(100);
    navigation.goBack();
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
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permContainer}>
        <Feather name="camera-off" size={48} color={colors.textSecondary} />
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

  // ── Pós-scan: tela de confirmação ──────────────────────────────────────────

  if (!cameraActive) {
    return (
      <SafeAreaView style={styles.confirmScreen} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.confirmHeader}>
          <TouchableOpacity
            onPress={() => {
              reset();
              setQuantity('');
              scannedRef.current = false;
              setCameraActive(true);
            }}
            style={styles.confirmBackBtn}
          >
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.confirmHeaderTitle}>Adicionar à lista</Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.confirmBody}>

              {/* Loading */}
              {isLoading && (
                <View style={styles.loadingCard}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.loadingCardText}>Buscando produto...</Text>
                </View>
              )}

              {/* Product card no topo */}
              {lastResult && (
                <View style={styles.productCard}>
                  <View style={styles.productIconWrap}>
                    <Feather name="package" size={28} color={colors.primary} />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{lastResult.name}</Text>
                    {lastResult.brand ? (
                      <Text style={styles.productBrand}>{lastResult.brand}</Text>
                    ) : null}
                  </View>
                </View>
              )}

              {lastResult && (
                <>
                  {/* Quantidade */}
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Quantidade</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={quantity}
                      onChangeText={setQuantity}
                      placeholder="Ex: 2"
                      keyboardType="numeric"
                      placeholderTextColor={colors.textSecondary}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>

                  {/* Seletor de lista */}
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Lista de compras</Text>
                    <TouchableOpacity
                      style={styles.listSelector}
                      onPress={() => setShowListPicker(true)}
                    >
                      <Feather name="shopping-cart" size={16} color={colors.primary} />
                      <Text style={styles.listSelectorText} numberOfLines={1}>
                        {selectedList ? selectedList.name : 'Selecionar lista...'}
                      </Text>
                      <Feather name="chevron-down" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Botões */}
                  <View style={styles.confirmButtons}>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => {
                        reset();
                        setQuantity('');
                        scannedRef.current = false;
                        setCameraActive(true);
                      }}
                    >
                      <Feather name="camera" size={16} color={colors.text} />
                      <Text style={styles.secondaryBtnText}>Escanear outro</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryBtn, !selectedListId && styles.primaryBtnDisabled]}
                      onPress={handleConfirm}
                      disabled={!selectedListId}
                    >
                      <Feather name="plus" size={16} color="#fff" />
                      <Text style={styles.primaryBtnText}>Adicionar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

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
                        <Feather name="check" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── Câmera ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={onBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topDark} pointerEvents="box-none">
          <SafeAreaView edges={['top']} pointerEvents="box-none">
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                <Feather name="x" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

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

        <View style={styles.bottomDark} pointerEvents="none">
          <Text style={styles.instructionText}>
            Aponte para o código de barras do produto
          </Text>
        </View>
      </View>

      {/* Manual input Modal */}
      <Modal
        visible={showManualInput}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowManualInput(false);
          scannedRef.current = false;
          setCameraActive(true);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => {
                setShowManualInput(false);
                scannedRef.current = false;
                setCameraActive(true);
              }}
            />
            <View style={styles.manualBox}>
              <Text style={styles.manualTitle}>Adicionar manualmente</Text>
              <TextInput
                style={styles.manualInput}
                placeholder="Nome do produto"
                value={manualName}
                onChangeText={setManualName}
                autoFocus
                placeholderTextColor={colors.textSecondary}
                returnKeyType="next"
              />
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Quantidade</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="Ex: 2"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    setShowManualInput(false);
                    setManualName('');
                    setQuantity('');
                    scannedRef.current = false;
                    setCameraActive(true);
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
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const SIDE_WIDTH = (SCREEN_WIDTH - VIEWFINDER_SIZE) / 2;

function getStyles(colors: any) { return StyleSheet.create({
  // ── Câmera ──
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topDark: { backgroundColor: DARK },
  topBar: { paddingHorizontal: 16, paddingVertical: 8 },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  middleRow: { flexDirection: 'row', height: VIEWFINDER_SIZE },
  darkSide: { width: SIDE_WIDTH, backgroundColor: DARK },
  viewfinder: { width: VIEWFINDER_SIZE, height: VIEWFINDER_SIZE },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#fff' },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 4 },
  bottomDark: {
    flex: 1, backgroundColor: DARK,
    alignItems: 'center', paddingTop: 24, paddingHorizontal: 32,
  },
  instructionText: {
    color: 'rgba(255,255,255,0.85)', fontSize: 14,
    textAlign: 'center', lineHeight: 20,
  },

  // ── Tela de confirmação pós-scan ──
  confirmScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: theme.spacing.sm,
  },
  confirmBackBtn: { padding: 6 },
  confirmHeaderTitle: {
    fontSize: 17, fontWeight: '700', color: colors.text,
  },
  confirmBody: {
    flex: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  loadingCardText: {
    fontSize: 15, color: colors.textSecondary,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 16,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  productIconWrap: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  productInfo: { flex: 1, gap: 4 },
  productName: {
    fontSize: 16, fontWeight: '700', color: colors.text,
  },
  productBrand: {
    fontSize: 13, color: colors.textSecondary,
  },
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 13, fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  fieldInput: {
    height: 46,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 15, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },
  listSelector: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12, paddingVertical: 13,
    gap: 8, borderWidth: 1, borderColor: colors.border,
  },
  listSelectorText: {
    flex: 1, fontSize: 15, color: colors.text,
  },
  confirmButtons: {
    flexDirection: 'row', gap: 12, marginTop: 4,
  },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', gap: 6,
    paddingVertical: 13, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 15, fontWeight: '600', color: colors.text,
  },
  primaryBtn: {
    flex: 1, flexDirection: 'row', gap: 6,
    paddingVertical: 13, borderRadius: theme.borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnDisabled: { backgroundColor: colors.border },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // ── Modals ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  sheetHandle: {
    alignSelf: 'center', width: 36, height: 4,
    borderRadius: 2, backgroundColor: colors.border, marginBottom: 4,
  },
  listPickerSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '60%',
  },
  listPickerTitle: {
    fontSize: 16, fontWeight: '700', color: colors.text,
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4,
  },
  noListsText: {
    fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', padding: 24,
  },
  listPickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  listPickerItemSelected: { backgroundColor: colors.primary + '10' },
  listPickerItemText: { flex: 1, fontSize: 15, color: colors.text },
  manualBox: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, gap: 12,
  },
  manualTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  manualInput: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text,
    borderWidth: 1, borderColor: colors.border,
  },

  // ── Loading overlay (câmera) ──
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },

  // ── Permission screen ──
  permContainer: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16,
  },
  permTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  permSubtitle: {
    fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 20,
  },
  permBtn: {
    backgroundColor: colors.primary, borderRadius: theme.borderRadius.md,
    paddingHorizontal: 24, paddingVertical: 13, marginTop: 8,
  },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  closeTextBtn: { paddingVertical: 10 },
  closeTextBtnText: { fontSize: 14, color: colors.textSecondary },
}); }
