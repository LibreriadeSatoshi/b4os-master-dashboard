import Link from "next/link"
import Image from "next/image"
import { allChallenges } from "@/lib/challenges"
import ChallengeCard from "@/components/ChallengeCard"
import UserProfile from "@/components/UserProfile"
import { RocketIcon, CodeIcon, ZapIcon, BookOpenIcon, UsersIcon, CalendarIcon, ArrowRightIcon, PlayIcon } from "lucide-react"

export default function Home() {
  const beginnerChallenges = allChallenges.filter(c => c.metadata.difficulty === 'beginner')
  const intermediateChallenges = allChallenges.filter(c => c.metadata.difficulty === 'intermediate')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center shadow-lg">
                  <Image 
                    src="/web-app-manifest-192x192.png" 
                    alt="B4OS Logo" 
                    width={40}
                    height={40}
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">B4OS Challenges</h1>
                  <p className="text-orange-300 text-sm font-medium">Desarrollo Bitcoin & Lightning</p>
                </div>
              </div>
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center text-white mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-orange-300 bg-clip-text text-transparent">
            Bitcoin 4 Open Source
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
            Plataforma de desafíos para el <span className="text-orange-400 font-semibold">programa B4OS</span>. 
            Demuestra tus habilidades a través de desafíos de programación prácticos en Bitcoin y Lightning Network.
            Buscamos desarrolladores apasionados por Bitcoin y Lightning Network que estén dispuestos a contribuir al ecosistema Bitcoin.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/start" 
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-600 transition-all duration-300 shadow-lg transform hover:scale-105"
            >
              <RocketIcon className="w-5 h-5" />
              Aceptar el Reto
            </Link>
            <Link 
              href="/challenges" 
              className="inline-flex items-center gap-2 bg-white/10 text-white px-8 py-4 rounded-lg font-semibold border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <BookOpenIcon className="w-5 h-5" />
              Explorar Desafíos
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10 hover:border-orange-500/50 transition-colors">
            <div className="flex justify-center mb-3">
              <CodeIcon className="w-8 h-8 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">{allChallenges.length}</div>
            <div className="text-gray-300">Challenges</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10 hover:border-orange-500/50 transition-colors">
            <div className="flex justify-center mb-3">
              <UsersIcon className="w-8 h-8 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">Gratuito</div>
            <div className="text-gray-300">Programa gratuito de entrenamiento técnico en Bitcoin para desarrolladores</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10 hover:border-orange-500/50 transition-colors">
            <div className="flex justify-center mb-3">
              <CalendarIcon className="w-8 h-8 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">2025</div>
            <div className="text-gray-300">Aplicaciones Abiertas hasta el 15 Oct. 2025</div>
          </div>
        </div>
      </section>

      {/* Featured Challenges */}
      <section className="container mx-auto px-6 pb-16">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <div className="flex items-center gap-3 mb-8">
            <ZapIcon className="w-6 h-6 text-orange-500" />
            <h3 className="text-2xl font-bold text-gray-900">Desafíos Destacados</h3>
          </div>
          
          {/* Beginner Challenges */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <PlayIcon className="w-5 h-5 text-green-600" />
              <h4 className="text-lg font-semibold text-gray-800">Nivel Principiante</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {beginnerChallenges.map((challenge) => (
                <ChallengeCard key={challenge.metadata.id} challenge={challenge.metadata} />
              ))}
            </div>
          </div>

          {/* Intermediate Challenges */}
          {intermediateChallenges.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <ZapIcon className="w-5 h-5 text-yellow-600" />
                <h4 className="text-lg font-semibold text-gray-800">Nivel Intermedio</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {intermediateChallenges.map((challenge) => (
                  <ChallengeCard 
                    key={challenge.metadata.id} 
                    challenge={challenge.metadata}
                    locked={true}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="text-center mt-8">
            <Link 
              href="/start" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg transform hover:scale-105"
            >
              <RocketIcon className="w-5 h-5" />
              Comenzar Desde el Inicio
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <div className="mt-4">
              <Link 
                href="/challenges" 
                className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm transition-colors"
              >
                O explora todos los desafíos
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white/5 backdrop-blur-sm text-gray-300 border-t border-white/10">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <p className="mb-2 font-medium">B4OS Challenges</p>
            <p className="text-sm text-gray-400">Construido por desarrolladores, para el ecosistema Bitcoin. ¡Buena suerte!</p>
          </div>
        </div>
        </footer>
      </div>
  )
}
