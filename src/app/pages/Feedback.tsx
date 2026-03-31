import { MessageSquareHeart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Feedback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center gap-3">
        <MessageSquareHeart className="h-9 w-9 text-slate-700" aria-hidden />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Обратная связь</h1>
          <p className="text-gray-600 mt-1">Предложения, вопросы и обсуждения процессов</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Скоро здесь</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            Раздел для отдела обратной связи, общего руководства и сервисной учётной записи. Здесь можно
            разместить форму или ссылку на внешний канал.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
