import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function Welcome() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <SafeAreaView style={{ flex: 1 }}>

        <View style={{ flex: 1 }} /> 
        {/* 上面全部留白 */}

        <View style={{ paddingHorizontal: 32, paddingBottom: 42 }}>
          
          <Text 
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#000',
              textAlign: 'center',
              lineHeight: 34,
              marginBottom: 28
            }}
          >
            Track Your Skin Health{"\n"}Journey
          </Text>

          <Pressable
            onPress={() => router.push('/auth/sign-up')} 
            style={{
              height: 56,
              borderRadius: 999,
              overflow: 'hidden',
              marginBottom: 18,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 }
            }}
          >
            <LinearGradient
              colors={['#18e4aa', '#18e4aa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{
                color: '#000',
                fontSize: 18,
                fontWeight: '700'
              }}>
                Get Started
              </Text>
            </LinearGradient>
          </Pressable>

          <Text style={{ textAlign: 'center', fontSize: 14, color: '#000' }}>
            Already have an account?{' '}
            <Text
              style={{ fontWeight: '700' }}
              onPress={() => router.push('/auth/sign-in')}
            >
              Sign In
            </Text>
          </Text>
          
        </View>
      </SafeAreaView>
    </View>
  );
}

