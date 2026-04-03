/* PROJETO: CONTROLE FINANCEIRO LUCIANO - V31.2
   DATA: MARÇO DE 2026
   FOCO: SPLASH SCREEN PERSISTENTE E CÁLCULOS MATEMÁTICOS
*/

import React, { useState, useEffect, useCallback } from 'react';
import * as SplashScreen from 'expo-splash-screen'; // Controle da tela de abertura
import { 
  StyleSheet, Text, View, TouchableOpacity, FlatList, 
  TextInput, ScrollView, SafeAreaView, Modal, Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Impede a Splash de sumir sozinha no início
SplashScreen.preventAutoHideAsync();

export default function App() {
  // --- ESTADOS DO APP ---
  const [appPronto, setAppPronto] = useState(false);
  const [tela, setTela] = useState('Inicio');
  const [gastos, setGastos] = useState([]);
  const [entradasMensais, setEntradasMensais] = useState({});
  const [mostrarInputEntrada, setMostrarInputEntrada] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('Outros');

  const Cores = {
    bg: '#F4F4F9',
    card: '#FFFFFF',
    destaque: '#3A506B', 
    dark: '#1C1C1E',
    sub: '#8E8E93',
    erro: '#FF4D4F'
  };

  const categorias = ["Supermercado", "Banco", "Cartão de Crédito", "Higiene/Gasto pessoal", "Combustível", "Lazer", "Carro", "Saúde", "Dívidas", "Outros"];
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const idMes = `${mesAtual.getMonth()}-${mesAtual.getFullYear()}`;

  // --- CARREGAMENTO INICIAL (COM DELAY PARA SPLASH) ---
  useEffect(() => {
    async function preparar() {
      try {
        const g = await AsyncStorage.getItem('@finance_v31_gastos');
        const e = await AsyncStorage.getItem('@finance_v31_entradas');
        if (g) setGastos(JSON.parse(g));
        if (e) setEntradasMensais(JSON.parse(e));

        // Aguarda 2 segundos para mostrar sua Splash Screen personalizada
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.warn(err);
      } finally {
        setAppPronto(true);
        await SplashScreen.hideAsync(); // Esconde a Splash e mostra o App
      }
    }
    preparar();
  }, []);

  // --- FUNÇÕES DE LÓGICA ---
  const salvarGasto = async () => {
    if (!descricao.trim() || !valor) {
      Alert.alert("Atenção", "Preencha a descrição e o valor.");
      return;
    }
    const valorNumerico = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNumerico)) {
      Alert.alert("Erro", "Valor inválido.");
      return;
    }
    const novoGasto = {
      id: Date.now().toString(),
      descricao: descricao.trim(),
      valor: valorNumerico,
      categoria,
      timestamp: mesAtual.getTime(),
      dataStr: mesAtual.toLocaleDateString('pt-BR')
    };
    const lista = [novoGasto, ...gastos];
    setGastos(lista);
    await AsyncStorage.setItem('@finance_v31_gastos', JSON.stringify(lista));
    setDescricao(''); setValor('');
  };

  const excluirGasto = (id) => {
    Alert.alert("Excluir", "Deseja apagar este lançamento?", [
      { text: "Cancelar" },
      { text: "Sim", onPress: async () => {
          const novaLista = gastos.filter(g => g.id !== id);
          setGastos(novaLista);
          await AsyncStorage.setItem('@finance_v31_gastos', JSON.stringify(novaLista));
        }
      }
    ]);
  };

  const atualizarEntrada = async (v) => {
    const novasEntradas = { ...entradasMensais, [idMes]: v };
    setEntradasMensais(novasEntradas);
    await AsyncStorage.setItem('@finance_v31_entradas', JSON.stringify(novasEntradas));
  };

  const processarEntradaMatematica = (input) => {
    atualizarEntrada(input);
  };

  const finalizarCalculoEntrada = () => {
    const valorAtual = entradasMensais[idMes] || '0';
    if (valorAtual.startsWith('=')) {
      const expressao = valorAtual.substring(1).replace(/,/g, '.');
      const total = expressao.split('+').reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
      atualizarEntrada(total.toFixed(2));
    }
  };

  // --- PROCESSAMENTO DE DADOS ---
  const rawEntrada = entradasMensais[idMes] || '0';
  const valorEntradaNumerico = rawEntrada.startsWith('=') 
    ? rawEntrada.substring(1).replace(/,/g, '.').split('+').reduce((a, b) => a + (parseFloat(b) || 0), 0)
    : parseFloat(rawEntrada.replace(',', '.')) || 0;

  const filtrados = gastos.filter(g => {
    const d = new Date(g.timestamp);
    return d.getMonth() === mesAtual.getMonth() && d.getFullYear() === mesAtual.getFullYear();
  }).sort((a, b) => b.timestamp - a.timestamp);

  const totalGastoMes = filtrados.reduce((acc, item) => acc + item.valor, 0);
  const saldoRestante = valorEntradaNumerico - totalGastoMes;

  const dadosGrafico = categorias.map(cat => {
    const totalCat = filtrados.filter(f => f.categoria === cat).reduce((acc, curr) => acc + curr.valor, 0);
    return { categoria: cat, total: totalCat };
  }).filter(d => d.total > 0);

  const maxValor = Math.max(...dadosGrafico.map(d => d.total), 1);

  // Trava a renderização enquanto a splash está ativa
  if (!appPronto) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.userName}>FINANÇAS • LUCIANO KORN</Text>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => setMesAtual(new Date(mesAtual.setMonth(mesAtual.getMonth() - 1)))}><Text style={styles.navBtn}>◀</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>{meses[mesAtual.getMonth()]} {mesAtual.getFullYear()}</Text>
          <TouchableOpacity onPress={() => setMesAtual(new Date(mesAtual.setMonth(mesAtual.getMonth() + 1)))}><Text style={styles.navBtn}>▶</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{paddingHorizontal: 15, paddingBottom: 150}}>
        {tela === 'Inicio' ? (
          <View>
            <View style={styles.saldoCard}>
              <View style={styles.saldoRow}>
                <View>
                  <Text style={styles.saldoLabel}>SALDO EM {meses[mesAtual.getMonth()].toUpperCase()}</Text>
                  <Text style={styles.saldoValor}>R$ {saldoRestante.toFixed(2)}</Text>
                </View>
                <TouchableOpacity onPress={() => setMostrarInputEntrada(!mostrarInputEntrada)} style={styles.ajusteBtn}>
                  <Text style={{color: '#FFF', fontSize: 10, fontWeight: 'bold'}}>SET ENTRADA</Text>
                </TouchableOpacity>
              </View>
              {mostrarInputEntrada && (
                <TextInput 
                  style={styles.inputEntrada} 
                  placeholder="Ex: =500+1200"
                  placeholderTextColor="#666"
                  value={rawEntrada} 
                  onChangeText={processarEntradaMatematica} 
                  onBlur={finalizarCalculoEntrada}
                  autoFocus 
                />
              )}
              <View style={styles.divider} />
              <Text style={styles.infoLabel}>TOTAL GASTO: R$ {totalGastoMes.toFixed(2)}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>NOVO GASTO</Text>
              <TextInput style={styles.input} placeholder="O que comprou?" value={descricao} onChangeText={setDescricao} />
              <TextInput style={styles.input} placeholder="Valor R$" keyboardType="numeric" value={valor} onChangeText={setValor} />
              <TouchableOpacity style={styles.selectorBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.selectorValue}>{categoria} ▼</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={salvarGasto}><Text style={styles.saveBtnText}>LANÇAR</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>DISTRIBUIÇÃO POR CATEGORIA</Text>
              <View style={styles.chartContainer}>
                {dadosGrafico.length > 0 ? dadosGrafico.map(d => (
                  <View key={d.categoria} style={styles.barWrapper}>
                    <Text style={styles.barValue}>R${d.total.toFixed(0)}</Text>
                    <View style={[styles.bar, { height: (d.total / maxValor) * 70 + 5, backgroundColor: Cores.destaque }]} />
                    <Text style={styles.barLabel}>{d.categoria.substring(0, 3)}</Text>
                  </View>
                )) : <Text style={styles.aviso}>Sem gastos registrados.</Text>}
              </View>
            </View>
            <Text style={styles.sectionTitle}>DETALHES DO HISTÓRICO</Text>
            {filtrados.map(item => (
              <View key={item.id} style={styles.itemGasto}>
                <View style={{flex: 1}}><Text style={styles.itemDesc}>{item.descricao}</Text><Text style={styles.itemSub}>{item.categoria} • {item.dataStr}</Text></View>
                <Text style={styles.itemValor}>- R$ {item.valor.toFixed(2)}</Text>
                <TouchableOpacity onPress={() => excluirGasto(item.id)} style={styles.deleteBtn}><Text style={{fontSize: 18}}>🗑️</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => setTela('Inicio')}>
            <Text style={[styles.tabText, {color: tela === 'Inicio' ? Cores.destaque : Cores.sub}]}>Lançar</Text>
          </TouchableOpacity>
          <View style={styles.tabDivider} />
          <TouchableOpacity style={styles.tabItem} onPress={() => setTela('Historico')}>
            <Text style={[styles.tabText, {color: tela === 'Historico' ? Cores.destaque : Cores.sub}]}>Histórico</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Categorias</Text>
            <FlatList data={categorias} renderItem={({item}) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setCategoria(item); setModalVisible(false); }}><Text style={styles.modalItemText}>{item}</Text></TouchableOpacity>
            )} />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}><Text style={{color: '#FFF', fontWeight: 'bold'}}>VOLTAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F4F9' },
  header: { paddingTop: 50, alignItems: 'center', paddingBottom: 15 },
  userName: { color: '#3A506B', fontSize: 22, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '90%', backgroundColor: '#FFF', padding: 12, borderRadius: 15, elevation: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  navBtn: { fontSize: 20, color: '#3A506B', paddingHorizontal: 15 },
  saldoCard: { backgroundColor: '#1C1C1E', padding: 22, borderRadius: 20, marginBottom: 20 },
  saldoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saldoLabel: { color: '#8E8E93', fontSize: 10, fontWeight: 'bold' },
  saldoValor: { color: '#FFF', fontSize: 30, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 15 },
  infoLabel: { color: '#FFADAD', fontSize: 12, fontWeight: 'bold' },
  ajusteBtn: { backgroundColor: '#3A506B', padding: 8, borderRadius: 8 },
  inputEntrada: { color: '#FFF', fontSize: 18, borderBottomWidth: 1, borderBottomColor: '#3A506B', marginTop: 10, paddingVertical: 5 },
  card: { backgroundColor: '#FFF', padding: 18, borderRadius: 20, marginBottom: 15, elevation: 3 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#8E8E93', marginBottom: 15, textTransform: 'uppercase' },
  chartContainer: { flexDirection: 'row', height: 130, alignItems: 'flex-end', justifyContent: 'space-around' },
  barWrapper: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 8, fontWeight: 'bold', color: '#3A506B', marginBottom: 2 },
  bar: { width: 18, borderRadius: 5 },
  barLabel: { fontSize: 9, color: '#8E8E93', marginTop: 5, fontWeight: 'bold' },
  input: { borderBottomWidth: 1, borderBottomColor: '#D1D1D6', paddingVertical: 12, marginBottom: 15, fontSize: 15 },
  selectorBtn: { padding: 14, backgroundColor: '#F2F2F7', borderRadius: 10, marginBottom: 15, alignItems: 'center' },
  selectorValue: { fontSize: 14, color: '#3A506B', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#3A506B', padding: 16, borderRadius: 15, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  itemGasto: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 1 },
  itemDesc: { fontWeight: 'bold', fontSize: 15 },
  itemSub: { fontSize: 11, color: '#8E8E93' },
  itemValor: { fontWeight: 'bold', color: '#FF4D4F', fontSize: 15 },
  deleteBtn: { marginLeft: 15, padding: 5 },
  tabContainer: { position: 'absolute', bottom: 30, width: '100%', alignItems: 'center' },
  tabBar: { flexDirection: 'row', width: '80%', height: 60, backgroundColor: '#FFF', borderRadius: 30, elevation: 10, alignItems: 'center', paddingHorizontal: 10 },
  tabItem: { flex: 1, alignItems: 'center' },
  tabDivider: { width: 1, height: '50%', backgroundColor: '#F2F2F7' },
  tabText: { fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, height: '55%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalItem: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' },
  modalItemText: { fontSize: 16 },
  closeBtn: { backgroundColor: '#3A506B', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 15 },
  aviso: { color: '#8E8E93', fontSize: 12, textAlign: 'center', width: '100%' }
});
