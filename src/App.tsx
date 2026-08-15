import { NavigationContainer, NavigationProp, StackActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BarChart3, BookMarked, BookOpen, CircleHelp, Home } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import mobileAds from 'react-native-google-mobile-ads';

import { HomeScreen } from './screens/HomeScreen';
import { LearnScreen } from './screens/LearnScreen';
import { LearningDomainScreen } from './screens/LearningDomainScreen';
import { LearningFoundationScreen } from './screens/LearningFoundationScreen';
import { LearningReaderScreen } from './screens/LearningReaderScreen';
import { LearningTopicScreen } from './screens/LearningTopicScreen';
import { ProblemScreen } from './screens/ProblemScreen';
import { LevelDetailScreen } from './screens/LevelDetailScreen';
import { QuestionScreen } from './screens/QuestionScreen';
import { AnswerScreen } from './screens/AnswerScreen';
import { StatsScreen } from './screens/StatsScreen';
import { BookmarksScreen } from './screens/BookmarksScreen';
import { DataProvider } from './data/DataProvider';
import { StudyProvider } from './state/StudyContext';
import { colors } from './theme';
import { LearningStackParamList, ProblemStackParamList, RootStackParamList, TabParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const LearnStack = createNativeStackNavigator<LearningStackParamList>();
const ProblemStack = createNativeStackNavigator<ProblemStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

const stackScreenOptions = {
  headerShown: true,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '900' },
  contentStyle: { backgroundColor: colors.bg },
} as const;

function LearnStackScreen() {
  return (
    <LearnStack.Navigator screenOptions={stackScreenOptions}>
      <LearnStack.Screen name="LearnHome" component={LearnScreen} options={{ headerShown: false }} />
      <LearnStack.Screen name="LearningFoundation" component={LearningFoundationScreen} options={{ title: '기초 챕터' }} />
      <LearnStack.Screen name="LearningDomain" component={LearningDomainScreen} options={{ title: '학습 영역' }} />
      <LearnStack.Screen name="LearningTopic" component={LearningTopicScreen} options={{ title: '챕터 목록' }} />
      <LearnStack.Screen name="LearningReader" component={LearningReaderScreen} options={{ title: '학습하기' }} />
    </LearnStack.Navigator>
  );
}

function ProblemStackScreen() {
  return (
    <ProblemStack.Navigator screenOptions={stackScreenOptions}>
      <ProblemStack.Screen name="ProblemHome" component={ProblemScreen} options={{ headerShown: false }} />
      <ProblemStack.Screen name="LevelDetail" component={LevelDetailScreen} options={{ title: '문제 목록' }} />
    </ProblemStack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 18);
  const resetTabStack = (navigation: NavigationProp<TabParamList>, routeKey: string) => {
    const tabRoute = navigation.getState().routes.find((route) => route.key === routeKey);
    const nestedStackKey = tabRoute?.state?.key;
    if (nestedStackKey) {
      navigation.dispatch({ ...StackActions.popToTop(), target: nestedStackKey });
    }
  };

  return (
    <Tabs.Navigator
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#CBD5E1',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800' },
        tabBarStyle: {
          height: 62 + bottomInset,
          paddingTop: 10,
          paddingBottom: bottomInset,
          borderTopColor: colors.line,
          backgroundColor: colors.card,
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '홈', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }}
        listeners={({ navigation, route }) => ({ tabPress: () => resetTabStack(navigation, route.key) })}
      />
      <Tabs.Screen
        name="Learn"
        component={LearnStackScreen}
        options={{ title: '학습', tabBarIcon: ({ color }) => <BookOpen size={22} color={color} /> }}
        listeners={({ navigation, route }) => ({ tabPress: () => resetTabStack(navigation, route.key) })}
      />
      <Tabs.Screen
        name="Problem"
        component={ProblemStackScreen}
        options={{ title: '문제', tabBarIcon: ({ color }) => <CircleHelp size={22} color={color} /> }}
        listeners={({ navigation, route }) => ({ tabPress: () => resetTabStack(navigation, route.key) })}
      />
      <Tabs.Screen
        name="Library"
        component={BookmarksScreen}
        options={{ title: '보관함', tabBarIcon: ({ color }) => <BookMarked size={22} color={color} /> }}
        listeners={({ navigation, route }) => ({ tabPress: () => resetTabStack(navigation, route.key) })}
      />
      <Tabs.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: '통계', tabBarIcon: ({ color }) => <BarChart3 size={22} color={color} /> }}
        listeners={({ navigation, route }) => ({ tabPress: () => resetTabStack(navigation, route.key) })}
      />
    </Tabs.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    mobileAds()
      .initialize()
      .catch(() => undefined);
  }, []);

  return (
    <DataProvider>
      <StudyProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootStack.Navigator screenOptions={stackScreenOptions}>
            <RootStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <RootStack.Screen name="Question" component={QuestionScreen} options={{ title: '' }} />
            <RootStack.Screen name="Answer" component={AnswerScreen} options={{ title: '' }} />
          </RootStack.Navigator>
        </NavigationContainer>
      </StudyProvider>
    </DataProvider>
  );
}
