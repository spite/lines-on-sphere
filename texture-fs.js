const shader = `
precision highp float;

uniform float time;

varying float life;

void main() {

	vec2 uv = gl_PointCoord;
	float d = length( uv - .5 );
	if( d > .5 ) {
		discard;
	}
	vec3 r = mix(vec3(255.,193.,0.)/255., vec3(255.,0.,0.)/255., 1.-life);
	vec3 g = mix(vec3(240.,257.,218.)/255., vec3(35.,77.,32.)/255., 1.-life);
	vec3 b = mix(vec3(113.,199.,236.)/255., vec3(0.,80.,115.)/255., 1.-life);
	vec3 c = vec3(0.);
	float t = mod(time, 9.);
	if(t<3.) {
		c = mix(r,g, (t/3.));
	} else if (t<6.){
		c = mix(g,b, ((t-3.)/3.));
	} else {
		c = mix(b,r, ((t-6.)/3.));
	}
	gl_FragColor = vec4(c,1.);
}
`;

export { shader };
