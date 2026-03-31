import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Modal, Text, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
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

export const IngredientItem = ({
  quantity, unit, name, onChangeQuantity, onChangeUnit, onChangeName, onRemove
}: IngredientItemProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [converterVisible, setConverterVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.quantityInput}
        value={quantity}
        onChangeText={v => onChangeQuantity(v.replace(/[^0-9.,]/g, ''))}
        placeholder="Qtd"
        keyboardType="numeric"
        returnKeyType="done"
      />
      
      <TouchableOpacity style={styles.unitPicker} onPress={() => setModalVisible(true)}>
        <Text style={{ color: unit ? theme.colors.text : theme.colors.textSecondary }}>
          {unit || 'Unid.'}
        </Text>
        <Feather name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={onChangeName}
        placeholder="Nome do Ingrediente"
        returnKeyType="done"
      />

      {/* Botão conversor rápido */}
      <TouchableOpacity onPress={() => setConverterVisible(true)} style={styles.converterBtn} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
        <Feather name="repeat" size={15} color={theme.colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <Feather name="x" size={20} color={theme.colors.error} />
      </TouchableOpacity>

      {/* Modal conversor rápido */}
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

      {/* Modal simples para selecionar Unidade */}
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  quantityInput: {
    width: 60,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    textAlign: 'center',
    backgroundColor: theme.colors.background,
  },
  unitPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 100,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  converterBtn: {
    padding: theme.spacing.sm,
  },
  removeBtn: {
    padding: theme.spacing.sm,
  },
  // Modal Styles
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', margin: theme.spacing.xl, borderRadius: theme.borderRadius.md, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', padding: theme.spacing.md, borderBottomWidth: 1, borderColor: theme.colors.border, textAlign: 'center' },
  unitOption: { padding: theme.spacing.md, borderBottomWidth: 1, borderColor: theme.colors.surface },
  unitText: { fontSize: 16, textAlign: 'center' },
  closeBtn: { padding: theme.spacing.md, backgroundColor: theme.colors.surface, alignItems: 'center', borderBottomLeftRadius: theme.borderRadius.md, borderBottomRightRadius: theme.borderRadius.md },
  closeBtnText: { fontWeight: 'bold', color: theme.colors.error }
});
