import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Modal, Text, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { UNITS } from '../../constants/units';
import { QuickConverterModal } from '../common/QuickConverterModal';

interface IngredientItemProps {
  quantity: string;
  unit: string;
  name: string;
  onChangeQuantity: (val: string) => void;
  onChangeUnit: (val: string) => void;
  onChangeName: (val: string) => void;
  onRemove: () => void;
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  quantityInput: {
    width: 60,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    textAlign: 'center',
    backgroundColor: colors.background,
    color: colors.text,
  },
  unitPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    backgroundColor: colors.background,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    backgroundColor: colors.background,
    color: colors.text,
  },
  converterBtn: {
    padding: theme.spacing.sm,
  },
  removeBtn: {
    padding: theme.spacing.sm,
  },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: colors.background, margin: theme.spacing.xl, borderRadius: theme.borderRadius.md, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', padding: theme.spacing.md, borderBottomWidth: 1, borderColor: colors.border, textAlign: 'center', color: colors.text },
  unitOption: { padding: theme.spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  unitText: { fontSize: 16, textAlign: 'center', color: colors.text },
  closeBtn: { padding: theme.spacing.md, backgroundColor: colors.surface, alignItems: 'center', borderBottomLeftRadius: theme.borderRadius.md, borderBottomRightRadius: theme.borderRadius.md },
  closeBtnText: { fontWeight: 'bold', color: colors.error }
});

export const IngredientItem = ({
  quantity, unit, name, onChangeQuantity, onChangeUnit, onChangeName, onRemove
}: IngredientItemProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [modalVisible, setModalVisible] = useState(false);
  const [converterVisible, setConverterVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.quantityInput}
        value={quantity}
        onChangeText={v => onChangeQuantity(v.replace(/[^0-9.,]/g, ''))}
        placeholder="Qtd"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numeric"
        returnKeyType="done"
      />

      <TouchableOpacity style={styles.unitPicker} onPress={() => setModalVisible(true)}>
        <Text style={{ color: unit ? colors.text : colors.textSecondary }}>
          {unit || 'Unid.'}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={onChangeName}
        placeholder="Nome do Ingrediente"
        placeholderTextColor={colors.textSecondary}
        returnKeyType="done"
      />

      <TouchableOpacity onPress={() => setConverterVisible(true)} style={styles.converterBtn} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
        <Feather name="repeat" size={15} color={colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <Feather name="x" size={20} color={colors.error} />
      </TouchableOpacity>

      <QuickConverterModal
        visible={converterVisible}
        initialUnit={unit}
        ingredientName={name}
        onClose={() => setConverterVisible(false)}
        onUse={(val, u) => {
          onChangeQuantity(val);
          onChangeUnit(u);
          setConverterVisible(false);
        }}
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar Unidade</Text>
            <FlatList
              data={UNITS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.unitOption}
                  onPress={() => {
                    onChangeUnit(item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.unitText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};
